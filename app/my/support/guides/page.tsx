const GUIDE_SECTIONS = [
  {
    title: "산책 경로 안내",
    description:
      "본 서비스가 제공하는 산책 경로는 공공데이터 및 알고리즘에 기초한 참고용 정보이며, 실제 도로 상황이나 안전을 보장하지 않습니다.",
  },
  {
    title: "책임 안내",
    description:
      "산책 중 발생하는 안전사고, 시설물 상태 등에 대해 운영자는 어떠한 법적 책임도 지지 않습니다.",
  },
  {
    title: "유료 데이터 및 손실 안내",
    description:
      "데이터 오류로 인해 발생한 유료 데이터(데이터 통신비 등) 및 기타 손실에 대해 책임지지 않습니다.",
  },
  {
    title: "개인정보 수집 안내",
    description:
      "본 서비스는 회원을 가입받지 않으며, 이름, 연락처, 위치데이터(GPS) 등 일체의 개인정보를 수집하지 않습니다.",
  },
  {
    title: "브라우저 저장 정보 안내",
    description:
      "서버 로그 및 브라우저 정보를 기록하지 않으며, 쿠키 및 세션 데이터는 이용자의 브라우저 내에만 저장됩니다.",
  },
  {
    title: "명시 사항",
    description:
      "이용자가 지도상에 직접 지정한 지점 정보를 바탕으로 산책 경로를 계산하며, 해당 정보는 서버에 저장되지 않고 연산 즉시 휘발됩니다.",
  },
] as const;

export default function SupportGuidesPage() {
  return (
    <div className="space-y-3">
      {GUIDE_SECTIONS.map((section) => (
        <section key={section.title} className="rounded-xl bg-white px-4 py-4">
          <h2 className="text-base font-semibold text-dg-black">
            {section.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-dg-gray-700">
            {section.description}
          </p>
        </section>
      ))}
    </div>
  );
}
