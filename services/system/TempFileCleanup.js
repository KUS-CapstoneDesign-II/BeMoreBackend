const fs = require('fs').promises;
const path = require('path');
const errorHandler = require('../ErrorHandler');

/**
 * Temporary File Cleanup Service
 *
 * Manages cleanup of temporary audio files and other temporary resources
 * to prevent disk space exhaustion.
 *
 * Features:
 * - Periodic cleanup of old files
 * - Size-based cleanup when threshold exceeded
 * - Graceful error handling
 * - Logging and metrics
 */
class TempFileCleanup {
  constructor(options = {}) {
    this.tmpDir = options.tmpDir || path.join(process.cwd(), 'tmp');
    this.maxAgeDays = options.maxAgeDays || 7; // Default: delete files older than 7 days
    this.maxSizeMB = options.maxSizeMB || 500; // Default: max 500MB in tmp directory
    this.checkIntervalMinutes = options.checkIntervalMinutes || 60; // Default: check every hour

    this.stats = {
      filesDeleted: 0,
      bytesFreed: 0,
      checksRun: 0,
      lastCheckTime: null,
      errors: 0,
    };

    this.log('[TempFileCleanup] 초기화 완료', {
      tmpDir: this.tmpDir,
      maxAgeDays: this.maxAgeDays,
      maxSizeMB: this.maxSizeMB,
      checkIntervalMinutes: this.checkIntervalMinutes,
    });
  }

  /**
   * Start automatic cleanup intervals
   */
  start() {
    // Run initial cleanup immediately
    this.cleanup().catch(err => {
      this.handleError(err, 'Initial cleanup failed');
    });

    // Schedule periodic cleanup
    this.intervalId = setInterval(() => {
      this.cleanup().catch(err => {
        this.handleError(err, 'Scheduled cleanup failed');
      });
    }, this.checkIntervalMinutes * 60 * 1000);

    // Cleanup on unref to allow process to exit
    if (this.intervalId && typeof this.intervalId.unref === 'function') {
      this.intervalId.unref();
    }

    this.log('✅ Temporary file cleanup started', {
      interval: `${this.checkIntervalMinutes}분`,
    });
  }

  /**
   * Stop automatic cleanup
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.log('⏹️ Temporary file cleanup stopped');
    }
  }

  /**
   * Main cleanup logic
   */
  async cleanup() {
    try {
      // Ensure tmp directory exists
      await fs.mkdir(this.tmpDir, { recursive: true });

      const now = Date.now();
      const maxAgeMs = this.maxAgeDays * 24 * 60 * 60 * 1000;
      const maxSizeBytes = this.maxSizeMB * 1024 * 1024;

      // Read all files in tmp directory
      const files = await fs.readdir(this.tmpDir, { withFileTypes: true });

      let totalSize = 0;
      const fileStats = [];

      // Collect file stats
      for (const file of files) {
        const filePath = path.join(this.tmpDir, file.name);
        try {
          const stat = await fs.stat(filePath);
          if (stat.isFile()) {
            fileStats.push({
              name: file.name,
              path: filePath,
              size: stat.size,
              mtime: stat.mtimeMs,
              ageMs: now - stat.mtimeMs,
            });
            totalSize += stat.size;
          }
        } catch (err) {
          this.log('⚠️ Failed to stat file', {
            file: file.name,
            error: err.message,
          });
        }
      }

      // Sort by modification time (oldest first)
      fileStats.sort((a, b) => b.mtime - a.mtime);

      // Phase 1: Delete files older than maxAgeDays
      const filesToDeleteByAge = fileStats.filter(
        f => f.ageMs > maxAgeMs
      );

      for (const file of filesToDeleteByAge) {
        try {
          await fs.unlink(file.path);
          this.stats.filesDeleted++;
          this.stats.bytesFreed += file.size;
          totalSize -= file.size;
          this.log('🗑️ Deleted (age)', {
            file: file.name,
            ageDays: Math.floor(file.ageMs / (24 * 60 * 60 * 1000)),
            size: `${(file.size / 1024).toFixed(2)}KB`,
          });
        } catch (err) {
          this.handleError(err, `Failed to delete file: ${file.name}`);
        }
      }

      // Phase 2: If total size still exceeds limit, delete oldest files
      if (totalSize > maxSizeBytes) {
        const remainingFiles = fileStats.filter(
          f => !filesToDeleteByAge.includes(f)
        );
        remainingFiles.sort((a, b) => a.mtime - b.mtime);

        for (const file of remainingFiles) {
          if (totalSize <= maxSizeBytes) break;

          try {
            await fs.unlink(file.path);
            this.stats.filesDeleted++;
            this.stats.bytesFreed += file.size;
            totalSize -= file.size;
            this.log('🗑️ Deleted (size limit)', {
              file: file.name,
              remainingSize: `${(totalSize / (1024 * 1024)).toFixed(2)}MB`,
            });
          } catch (err) {
            this.handleError(err, `Failed to delete file: ${file.name}`);
          }
        }
      }

      this.stats.checksRun++;
      this.stats.lastCheckTime = new Date();

      this.log('✅ Cleanup completed', {
        filesDeleted: this.stats.filesDeleted,
        bytesFreed: `${(this.stats.bytesFreed / (1024 * 1024)).toFixed(2)}MB`,
        remainingSize: `${(totalSize / (1024 * 1024)).toFixed(2)}MB`,
      });
    } catch (err) {
      this.handleError(err, 'Cleanup process failed');
    }
  }

  /**
   * Get cleanup statistics
   */
  getStats() {
    return {
      ...this.stats,
      lastCheckTime: this.stats.lastCheckTime ? this.stats.lastCheckTime.toISOString() : null,
      bytesFreedMB: (this.stats.bytesFreed / (1024 * 1024)).toFixed(2),
    };
  }

  /**
   * Get current tmp directory size
   */
  async getDirectorySize() {
    try {
      const files = await fs.readdir(this.tmpDir, { withFileTypes: true });
      let totalSize = 0;

      for (const file of files) {
        if (file.isFile()) {
          const filePath = path.join(this.tmpDir, file.name);
          const stat = await fs.stat(filePath);
          totalSize += stat.size;
        }
      }

      return totalSize;
    } catch (err) {
      this.log('⚠️ Failed to calculate directory size', {
        error: err.message,
      });
      return 0;
    }
  }

  /**
   * Clean specific session's temporary files
   */
  async cleanupSessionFiles(sessionId) {
    try {
      const sessionPrefix = `session_${sessionId}`;
      const files = await fs.readdir(this.tmpDir, { withFileTypes: true });

      for (const file of files) {
        if (file.name.includes(sessionPrefix) && file.isFile()) {
          const filePath = path.join(this.tmpDir, file.name);
          try {
            const stat = await fs.stat(filePath);
            await fs.unlink(filePath);
            this.stats.filesDeleted++;
            this.stats.bytesFreed += stat.size;
            this.log('🗑️ Session file deleted', {
              sessionId,
              file: file.name,
            });
          } catch (err) {
            this.log('⚠️ Failed to delete session file', {
              file: file.name,
              error: err.message,
            });
          }
        }
      }
    } catch (err) {
      this.handleError(err, `Failed to cleanup session files: ${sessionId}`);
    }
  }

  /**
   * Logging helper
   */
  log(message, data = {}) {
    console.log(`[TempFileCleanup] ${message}`, data);
  }

  /**
   * Error handling
   */
  handleError(error, context = 'Unknown error') {
    this.stats.errors++;
    errorHandler.handle(error, {
      module: 'TempFileCleanup',
      level: errorHandler.levels.WARNING,
      metadata: { context },
    });
    this.log(`⚠️ Error: ${context}`, {
      error: error.message,
    });
  }
}

module.exports = TempFileCleanup;
