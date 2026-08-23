// /ads.txt — 애드센스가 요구하는 판매자 선언 파일.
// 게시자 ID는 배포 워크플로가 PUBLIC_ADSENSE_ID(ca-pub-...)로 주입한다.
// 값이 없으면(승인 전·로컬) 빈 파일 대신 404 대신 빈 응답을 주지 않도록 주석만 남긴다.
import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const id = import.meta.env.PUBLIC_ADSENSE_ID as string | undefined;
  // ca-pub-1234... → pub-1234...
  const pub = id?.replace(/^ca-/, '');
  const body = pub
    ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`
    : '# PUBLIC_ADSENSE_ID가 설정되면 이 파일에 게시자 선언이 생성됩니다.\n';
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
