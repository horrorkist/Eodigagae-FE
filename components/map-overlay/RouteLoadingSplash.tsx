"use client";

import { motion, useAnimationControls } from "framer-motion";
import Image from "next/image";
import { useEffect } from "react";

type RouteLoadingSplashProps = {
  message: string;
};

const ROUTE_LOADING_LAYERS = [
  {
    src: "/images/route/route-loading-dog1.svg",
    left: 0,
    top: 108,
    width: 89,
    height: 109,
    initialX: -92,
    initialY: 54,
    delay: 0,
    zIndex: 2,
  },
  {
    src: "/images/route/route-loading-dog2.svg",
    left: 36,
    top: 17.3,
    width: 152,
    height: 211,
    initialX: 0,
    initialY: 152,
    delay: 0.55,
    zIndex: 1,
  },
  {
    src: "/images/route/route-loading-dog3.svg",
    left: 92,
    top: 62,
    width: 138,
    height: 166,
    initialX: 92,
    initialY: 54,
    delay: 1.1,
    zIndex: 2,
  },
] as const;

export default function RouteLoadingSplash({
  message,
}: RouteLoadingSplashProps) {
  const dog1Controls = useAnimationControls();
  const dog2Controls = useAnimationControls();
  const dog3Controls = useAnimationControls();

  useEffect(() => {
    const controls = [dog1Controls, dog2Controls, dog3Controls];
    let active = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timeoutId = window.setTimeout(() => {
          timeoutId = null;
          resolve();
        }, ms);
      });

    const waitForNextFrame = () =>
      new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });

    const resetAll = () => {
      controls.forEach((control, index) => {
        const layer = ROUTE_LOADING_LAYERS[index];
        control.stop();
        control.set({ x: layer.initialX, y: layer.initialY });
      });
    };

    const run = async () => {
      resetAll();
      await waitForNextFrame();

      while (active) {
        const first = controls[0].start({
          x: 0,
          y: 0,
          transition: { duration: 0.78, ease: "easeOut" },
        });

        await wait(550);
        if (!active) break;

        const second = controls[1].start({
          x: 0,
          y: 0,
          transition: { duration: 0.78, ease: "easeOut" },
        });

        await wait(550);
        if (!active) break;

        const third = controls[2].start({
          x: 0,
          y: 0,
          transition: { duration: 0.78, ease: "easeOut" },
        });

        await Promise.all([first, second, third]);
        if (!active) break;

        await wait(1200);
        if (!active) break;

        resetAll();
        await waitForNextFrame();
      }
    };

    void run();

    return () => {
      active = false;
      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
      }
      controls.forEach((control) => control.stop());
    };
  }, [dog1Controls, dog2Controls, dog3Controls]);

  const layerControls = [dog1Controls, dog2Controls, dog3Controls] as const;

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-white/88 px-6 backdrop-blur-sm">
      <div className="flex w-full max-w-xs flex-col items-center text-center">
        <div className="relative mb-6 h-40 w-40">
          <div className="absolute inset-0 overflow-hidden rounded-full shadow-[0_14px_34px_rgba(44,44,44,0.08)]">
            <Image
              src="/images/route/route-loading-background.svg"
              alt=""
              fill
              sizes="160px"
              priority
              className="object-cover"
              aria-hidden="true"
            />
            {ROUTE_LOADING_LAYERS.map((layer, index) => (
              <motion.div
                key={layer.src}
                animate={layerControls[index]}
                className="absolute"
                style={{
                  left: `${(layer.left / 230) * 100}%`,
                  top: `${(layer.top / 228) * 100}%`,
                  width: `${(layer.width / 230) * 100}%`,
                  height: `${(layer.height / 228) * 100}%`,
                  zIndex: layer.zIndex,
                }}
                initial={{ x: layer.initialX, y: layer.initialY }}
              >
                <Image
                  src={layer.src}
                  alt=""
                  fill
                  sizes="160px"
                  priority
                  className="object-contain"
                  aria-hidden="true"
                />
              </motion.div>
            ))}
          </div>
        </div>
        <p className="whitespace-pre-line text-xl font-semibold leading-8 tracking-[-0.03em] text-dg-black">
          {message}
        </p>
        <div
          className="mt-7 flex items-center justify-center gap-2"
          aria-hidden="true"
        >
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="h-2 w-2 rounded-full bg-dg-gray-500 [animation:route-loading-bounce_1.2s_ease-in-out_infinite]"
              style={{ animationDelay: `${index * 160}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
