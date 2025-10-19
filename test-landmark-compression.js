console.log('🧪 랜드마크 압축 검증 테스트\n');

// 468개 전체 랜드마크 시뮬레이션
function generate468Landmarks() {
  return Array(468).fill(null).map(() => ({
    x: Math.random(),
    y: Math.random(),
    z: Math.random() * 0.1
  }));
}

// 68개 압축 랜드마크
const KEY_LANDMARKS = {
  eyes: [
    33, 133, 160, 144, 158, 153, 145, 159, 246, 163,
    362, 263, 387, 373, 385, 380, 374, 386, 466, 390
  ],
  eyebrows: [
    70, 63, 105, 66, 107,
    300, 293, 334, 296, 336
  ],
  mouth: [
    61, 291, 0, 17, 37, 39, 40, 185, 409, 267,
    269, 270, 78, 308, 324, 318, 402, 317, 14, 87
  ],
  nose: [1, 2, 98, 327, 4, 5, 195, 197],
  contour: [10, 338, 297, 332, 284, 251, 389, 356, 454, 234]
};

function compressLandmarks(landmarks) {
  const compressed = {
    eyes: [],
    eyebrows: [],
    mouth: [],
    nose: [],
    contour: []
  };

  for (const [region, indices] of Object.entries(KEY_LANDMARKS)) {
    compressed[region] = indices.map(index => ({
      x: landmarks[index].x,
      y: landmarks[index].y,
      z: landmarks[index].z
    }));
  }

  return compressed;
}

// 테스트 실행
console.log('=== 데이터 생성 ===');
const full468 = generate468Landmarks();
console.log(`✅ 468개 랜드마크 생성 완료`);

console.log('\n=== 압축 실행 ===');
const compressed68 = compressLandmarks(full468);
console.log(`✅ 68개 랜드마크로 압축 완료`);

console.log('\n=== 데이터 크기 비교 ===');
const full468Size = JSON.stringify(full468).length;
const compressed68Size = JSON.stringify(compressed68).length;

console.log(`468개 데이터 크기: ${full468Size} bytes (${(full468Size / 1024).toFixed(2)} KB)`);
console.log(`68개 데이터 크기: ${compressed68Size} bytes (${(compressed68Size / 1024).toFixed(2)} KB)`);

const reduction = ((full468Size - compressed68Size) / full468Size * 100).toFixed(1);
console.log(`\n압축률: ${reduction}% 절감`);

console.log('\n=== 30fps 전송 시 대역폭 ===');
const fps = 30;
const full468Bandwidth = (full468Size * fps / 1024).toFixed(2);
const compressed68Bandwidth = (compressed68Size * fps / 1024).toFixed(2);

console.log(`468개 @ 30fps: ${full468Bandwidth} KB/s`);
console.log(`68개 @ 30fps: ${compressed68Bandwidth} KB/s`);

console.log('\n=== 1분 전송량 ===');
const full468PerMin = (full468Bandwidth * 60 / 1024).toFixed(2);
const compressed68PerMin = (compressed68Bandwidth * 60 / 1024).toFixed(2);

console.log(`468개: ${full468PerMin} MB/분`);
console.log(`68개: ${compressed68PerMin} MB/분`);

console.log('\n=== 랜드마크 개수 검증 ===');
let totalCount = 0;
for (const [region, landmarks] of Object.entries(compressed68)) {
  console.log(`${region}: ${landmarks.length}개`);
  totalCount += landmarks.length;
}
console.log(`총합: ${totalCount}개`);

if (totalCount === 68) {
  console.log('\n✅ 랜드마크 개수 검증 성공!');
} else {
  console.log(`\n❌ 랜드마크 개수 오류! 예상: 68개, 실제: ${totalCount}개`);
}

console.log('\n=== 데이터 무결성 검증 ===');
// 샘플 데이터 확인
console.log('눈 첫 번째 포인트:', compressed68.eyes[0]);
console.log('입 첫 번째 포인트:', compressed68.mouth[0]);

// 모든 포인트에 x, y, z가 있는지 확인
let isValid = true;
for (const region of Object.values(compressed68)) {
  for (const point of region) {
    if (typeof point.x !== 'number' || typeof point.y !== 'number' || typeof point.z !== 'number') {
      isValid = false;
      break;
    }
  }
}

if (isValid) {
  console.log('✅ 모든 포인트 데이터 무결성 확인');
} else {
  console.log('❌ 데이터 무결성 오류 발견');
}

console.log('\n✅ 랜드마크 압축 검증 완료!');
