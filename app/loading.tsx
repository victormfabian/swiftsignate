import { LogoMark } from "@/components/logo-mark";

export default function Loading() {
  return (
    <div className="brand-loader" role="status" aria-live="polite" aria-label="Loading Swift Signate">
      <div className="brand-loader__halo" />
      <div className="brand-loader__panel glass-panel gradient-stroke noise relative overflow-hidden rounded-[32px] px-7 py-8 shadow-[0_26px_70px_rgba(140,110,78,0.14)] md:px-10 md:py-10">
        <div className="brand-loader__panel-glow" />
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LogoMark />
            <div className="brand-loader__brand">
              <span className="brand-loader__eyebrow">Swift Signate</span>
              <strong>Preparing your route</strong>
            </div>
          </div>
          <div className="brand-loader__metrics">
            <span>Secure booking</span>
            <span>Live tracking</span>
          </div>
        </div>

        <div className="brand-loader__route">
          <span className="brand-loader__node brand-loader__node--origin" />
          <span className="brand-loader__path" />
          <span className="brand-loader__signal" />
          <span className="brand-loader__node brand-loader__node--destination" />
        </div>

        <div className="brand-loader__copy">
          <p>Syncing your latest content, routes, and shipment workspace.</p>
        </div>
      </div>
    </div>
  );
}
