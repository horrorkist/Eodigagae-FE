"use client";

import DogInfoForm from "@/components/DogInfoForm";
import { useRouter } from "next/navigation";

export default function InputPage() {
  const router = useRouter();

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold">강아지 정보 입력</h1>
      <DogInfoForm onSubmitSuccess={() => router.push("/map")} />
    </div>
  );
}
