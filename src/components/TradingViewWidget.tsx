import { useEffect, useRef } from "react";

export function TradingViewWidget({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let aborted = false;
    const ro = new ResizeObserver(() => {});
    ro.observe(containerRef.current);
    const id = `tv_${symbol.replace(/[:/]/g, "_")}`;
    containerRef.current.innerHTML = "";
    const chartDiv = document.createElement("div");
    chartDiv.id = id;
    chartDiv.style.width = "100%";
    chartDiv.style.height = "100%";
    containerRef.current.appendChild(chartDiv);
    const createWidget = () => {
      const tv = (window as any).TradingView;
      if (aborted || !tv || !chartDiv || !containerRef.current) return;
      new tv.widget({
        symbol,
        interval: "1",
        timezone: "Etc/UTC",
        theme: "light",
        style: "1",
        locale: "en",
        toolbar_bg: "#f8fafc",
        enable_publishing: false,
        allow_symbol_change: false,
        hide_side_toolbar: false,
        hide_top_toolbar: false,
        withdateranges: true,
        container_id: id,
        autosize: true,
        width: "100%",
      });
    };

    const obs = new IntersectionObserver((entries) => {
      if (aborted) return;
      const entry = entries[0];
      if (entry && entry.isIntersecting) {
        if ((window as any).TradingView) createWidget();
        else {
          let script = document.getElementById("tradingview-js") as HTMLScriptElement | null;
          if (!script) {
            script = document.createElement("script");
            script.id = "tradingview-js";
            script.src = "https://s3.tradingview.com/tv.js";
            script.type = "text/javascript";
            script.async = true;
            script.onload = () => createWidget();
            document.head.appendChild(script);
          } else {
            script.addEventListener("load", createWidget, { once: true });
          }
        }
        obs.disconnect();
      }
    }, { rootMargin: '200px' });
    obs.observe(containerRef.current);

    if ((window as any).TradingView) {
      // Wait for intersection observer to trigger instead of immediate create
    } else {
      let script = document.getElementById("tradingview-js") as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = "tradingview-js";
        script.src = "https://s3.tradingview.com/tv.js";
        script.type = "text/javascript";
        script.async = true;
        script.onload = () => {};
        document.head.appendChild(script);
      } else {
        script.addEventListener("load", () => {}, { once: true });
      }
    }
    return () => {
      aborted = true;
      ro.disconnect();
      obs.disconnect();
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [symbol]);

  return <div ref={containerRef} className="w-full h-full" />;
}
