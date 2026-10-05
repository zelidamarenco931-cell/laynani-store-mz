import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { captureAttribution, initMetaPixel, trackPixel } from "@/lib/metaPixel";

// Dispara PageView em cada mudança de rota e guarda os parâmetros UTM dos anúncios.
const MetaPixelTracker = () => {
  const location = useLocation();

  useEffect(() => {
    initMetaPixel();
  }, []);

  useEffect(() => {
    captureAttribution();
    trackPixel("PageView");
  }, [location.pathname, location.search]);

  return null;
};

export default MetaPixelTracker;
