"use client";

import { PoiStyle } from "@/lib/poiMarker";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import { useState } from "react";

export default function PoiThumb({
  src,
  alt,
  poiStyle,
}: {
  src?: string | null;
  alt: string;
  poiStyle: PoiStyle;
}) {
  const [failed, setFailed] = useState(false);

  const showImage = !!src && !failed;

  return (
    <div className="relative h-20 w-20 flex-none overflow-hidden rounded-xl bg-gray-100 ring-1 ring-black/5">
      {showImage ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="80px"
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center text-white`}
          style={{
            backgroundColor: poiStyle.bg,
          }}
        >
          <FontAwesomeIcon icon={poiStyle.icon} size="2xl" />
        </div>
      )}
    </div>
  );
}
