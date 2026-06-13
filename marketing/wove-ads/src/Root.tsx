import { Composition } from "remotion";
import "./style.css";
import { TestLogo } from "./compositions/TestLogo";
import { Ad1A_StopScrolling } from "./compositions/Ad1A_StopScrolling";
import { Ad1B_TinderForThrift } from "./compositions/Ad1B_TinderForThrift";
import { Ad2A_TasteIn10Swipes } from "./compositions/Ad2A_TasteIn10Swipes";
import { Ad3A_ClosetCash } from "./compositions/Ad3A_ClosetCash";
import { Ad4A_DMtoDelivered } from "./compositions/Ad4A_DMtoDelivered";

const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="test-logo"
        component={TestLogo}
        durationInFrames={FPS * 3}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="wove-p1-va"
        component={Ad1A_StopScrolling}
        durationInFrames={FPS * 18}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="wove-p1-vb"
        component={Ad1B_TinderForThrift}
        durationInFrames={FPS * 15}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="wove-p2-va"
        component={Ad2A_TasteIn10Swipes}
        durationInFrames={FPS * 15}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="wove-p3-va"
        component={Ad3A_ClosetCash}
        durationInFrames={FPS * 15}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="wove-p4-va"
        component={Ad4A_DMtoDelivered}
        durationInFrames={FPS * 15}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
