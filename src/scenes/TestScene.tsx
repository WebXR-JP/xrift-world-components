import { VideoPlayer } from "../components/VideoPlayer";
import { LiveVideoPlayer } from "../components/LiveVideoPlayer";

/**
 * VideoPlayer / LiveVideoPlayer のテストシーン
 */
export function TestScene() {
  return (
    <>
      {/* ビデオプレイヤー（左） */}
      <VideoPlayer
        id="video-player"
        position={[-2.5, 1.125, 0]}
        width={4}
        volume={0}
        playing
        url="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
      />

      {/* ライブビデオプレイヤー（右） */}
      <LiveVideoPlayer
        id="live-player"
        position={[2.5, 1.125, 0]}
        width={4}
        volume={0}
      />
    </>
  );
}
