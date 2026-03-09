import { resolveMediaSource } from "@/lib/media-utils";

type LogoMarkProps = {
  tone?: "light" | "dark";
  mediaSrc?: string;
};

export function LogoMark({ tone = "dark", mediaSrc = "" }: LogoMarkProps) {
  const isLight = tone === "light";
  const media = resolveMediaSource(mediaSrc);
  const renderUploadedLogo = media.kind === "image" || media.kind === "video";

  return (
    <div className="flex items-center">
      <div
        className={[
          "relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl",
          isLight ? "border border-white/20 bg-white/10" : "border border-black/8 bg-white"
        ].join(" ")}
      >
        <div
          className={[
            "absolute inset-[1px] rounded-[15px] bg-gradient-to-br via-transparent",
            isLight ? "from-white/20 to-orange-200/20" : "from-ember/20 to-orange-100"
          ].join(" ")}
        />
        {renderUploadedLogo ? (
          media.kind === "image" ? (
            <img src={media.src} alt="Swift Signate logo" className="relative h-8 w-8 object-contain" />
          ) : (
            <video src={media.src} className="relative h-8 w-8 rounded-lg object-cover" autoPlay muted loop playsInline />
          )
        ) : (
          <svg viewBox="0 0 32 32" className={["relative h-6 w-6", isLight ? "text-white" : "text-neutral-900"].join(" ")} fill="none">
            <path
              d="M6 9.5h11.5L13 16h13l-9 6.5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.4"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
