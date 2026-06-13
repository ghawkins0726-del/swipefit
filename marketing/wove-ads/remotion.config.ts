import { Config } from "@remotion/cli/config";
import { enableTailwind } from "@remotion/tailwind-v4";

Config.setVideoImageFormat("jpeg");
Config.overrideWebpackConfig((currentConfig) => {
  return enableTailwind(currentConfig);
});
