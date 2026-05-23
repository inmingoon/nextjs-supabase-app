import { Suspense } from "react";

/**
 * 그룹 상세 레이아웃.
 * PPR 환경에서 layout 최상위 await는 빌드를 깨뜨릴 수 있으므로
 * 인증·권한 검증은 page의 Suspense 자식 컴포넌트에 위임.
 */
export default function GroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense>{children}</Suspense>;
}
