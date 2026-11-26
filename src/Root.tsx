import { Composition } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import { Minimal } from "./Minimal";
import { KentonganShort, KENTONGAN_FRAMES } from "./videos/kentongan/Kentongan";
import { KedutanShort, KEDUTAN_FRAMES } from "./videos/kedutan/Kedutan";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="BridgeShort"
        component={BridgeShort}
        durationInFrames={BRIDGE_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="KentonganShort"
        component={KentonganShort}
        durationInFrames={KENTONGAN_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="KedutanShort"
        component={KedutanShort}
        durationInFrames={KEDUTAN_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Minimal"
        component={Minimal}
        durationInFrames={30}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
