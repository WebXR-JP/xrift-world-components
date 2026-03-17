import { VideoPlayer } from "../components/VideoPlayer";

/**
 * VideoPlayerのテストシーン
 */
export function TestScene() {
  return (
    <>
      {/* ビデオプレイヤー（正面） */}
      <VideoPlayer
        id="video-player"
        position={[0, 1.125, 0]}
        width={4}
        volume={0}
        playing
        url="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
      />
    </>
  );
}
