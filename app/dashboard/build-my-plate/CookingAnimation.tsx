"use client";

type Props = {
  animationType: string;
  emoji: string;
};

const HEATING_ACTIONS = ["heat", "boil", "cook", "fry"];

export default function CookingAnimation({ animationType, emoji }: Props) {
  const isHeating = HEATING_ACTIONS.includes(animationType);

  return (
    <div className="cook-stage">
      <div className="stage-backdrop" />

      {isHeating && (
        <div className="steam">
          <span />
          <span />
          <span />
        </div>
      )}

      {/* stove + pot sit dead center, everything else layers on top of this */}
      <div className="stove-unit">
        <div className={`flame-glow ${isHeating ? "on" : ""}`} />

        <div className="pot">
          <div className="pot-handle left" />
          <div className="pot-handle right" />
          <div className="pot-rim" />
          <div className="pot-body">
            <div className="pot-contents">
              <span className="content-emoji">{emoji}</span>

              {isHeating && (
                <div className="bubbles">
                  <span />
                  <span />
                  <span />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="stove-base" />

        {isHeating && (
          <div className="flames">
            <span>🔥</span>
            <span>🔥</span>
            <span>🔥</span>
          </div>
        )}
      </div>

      {/* action-specific layer, positioned above the pot */}
      <div className={`action-layer action-${animationType}`}>
        {animationType === "chop" && (
          <div className="chop-scene">
            <span className="chop-board" />
            <span className="chop-food">{emoji}</span>
            <span className="chop-knife">🔪</span>
          </div>
        )}

        {animationType === "mix" && (
          <span className="mix-spoon">🥄</span>
        )}

        {(animationType === "pour" || animationType === "add") && (
          <div className="drop-scene">
            <span className="drop-emoji">{emoji}</span>
            {animationType === "pour" && (
              <div className="stream">
                <span />
                <span />
                <span />
              </div>
            )}
          </div>
        )}

        {animationType === "sprinkle" && (
          <div className="sprinkle-scene">
            <span className="sprinkle-hand">🧂</span>
            <div className="particles">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        {animationType === "serve" && (
          <div className="serve-scene">
            <span className="serve-plate">🍽️</span>
            <span className="serve-food">{emoji}</span>
          </div>
        )}
      </div>

      <style jsx>{`
        .cook-stage {
          position: relative;
          height: 300px;
          border-radius: 22px;
          border: 1px solid rgba(255, 255, 255, 0.09);
          overflow: hidden;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }

        .stage-backdrop {
          position: absolute;
          inset: 0;
          background: radial-gradient(
              circle at 50% 22%,
              rgba(255, 215, 0, 0.1),
              transparent 48%
            ),
            linear-gradient(
              180deg,
              rgba(167, 139, 250, 0.08),
              rgba(15, 23, 42, 0.6)
            );
        }

        .steam {
          position: absolute;
          top: 30px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 22px;
          z-index: 2;
        }

        .steam span {
          width: 6px;
          height: 26px;
          border-radius: 999px;
          background: linear-gradient(
            180deg,
            rgba(226, 232, 240, 0.35),
            transparent
          );
          animation: steamRise 2.2s ease-in-out infinite;
        }

        .steam span:nth-child(2) {
          animation-delay: 0.35s;
          height: 34px;
        }

        .steam span:nth-child(3) {
          animation-delay: 0.7s;
        }

        @keyframes steamRise {
          0% {
            transform: translateY(0) scaleY(0.6);
            opacity: 0;
          }
          30% {
            opacity: 0.7;
          }
          100% {
            transform: translateY(-40px) scaleY(1.3);
            opacity: 0;
          }
        }

        .stove-unit {
          position: relative;
          width: 240px;
          height: 150px;
          margin-bottom: 26px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          z-index: 1;
        }

        .stove-base {
          position: absolute;
          bottom: 0;
          left: 10%;
          right: 10%;
          height: 16px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.85);
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.05);
        }

        .flame-glow {
          position: absolute;
          bottom: 8px;
          width: 140px;
          height: 40px;
          border-radius: 50%;
          background: rgba(251, 146, 60, 0);
          filter: blur(12px);
          transition: background 0.3s ease;
        }

        .flame-glow.on {
          background: rgba(251, 146, 60, 0.35);
        }

        .flames {
          position: absolute;
          bottom: 10px;
          display: flex;
          gap: 4px;
          font-size: 20px;
          animation: flicker 0.5s ease-in-out infinite alternate;
        }

        @keyframes flicker {
          from {
            transform: scale(0.92) translateY(1px);
          }
          to {
            transform: scale(1.08) translateY(-3px);
          }
        }

        .pot {
          position: relative;
          bottom: 22px;
          width: 170px;
          height: 88px;
          animation: potSway 2.6s ease-in-out infinite;
        }

        @keyframes potSway {
          0%,
          100% {
            transform: rotate(-1deg);
          }
          50% {
            transform: rotate(1deg);
          }
        }

        .pot-handle {
          position: absolute;
          top: 22px;
          width: 26px;
          height: 14px;
          border-radius: 6px;
          background: #475569;
          border: 2px solid #64748b;
        }

        .pot-handle.left {
          left: -20px;
        }

        .pot-handle.right {
          right: -20px;
        }

        .pot-rim {
          position: absolute;
          top: 0;
          left: 6px;
          right: 6px;
          height: 14px;
          border-radius: 50%;
          background: #64748b;
          box-shadow: inset 0 -2px 3px rgba(0, 0, 0, 0.35);
        }

        .pot-body {
          position: absolute;
          top: 8px;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: 0 0 70px 70px;
          background: linear-gradient(180deg, #52606f, #1f2733);
          border: 2px solid #64748b;
          border-top: none;
          overflow: hidden;
        }

        .pot-contents {
          position: absolute;
          top: -2px;
          left: 12px;
          right: 12px;
          height: 34px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(251, 191, 36, 0.28),
            rgba(180, 83, 9, 0.18)
          );
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .content-emoji {
          font-size: 26px;
          animation: contentsBob 1.3s ease-in-out infinite;
        }

        @keyframes contentsBob {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-4px) scale(1.06);
          }
        }

        .bubbles {
          position: absolute;
          inset: 0;
        }

        .bubbles span {
          position: absolute;
          bottom: 2px;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.55);
          animation: bubbleUp 1.4s ease-in infinite;
        }

        .bubbles span:nth-child(1) {
          left: 20%;
          animation-delay: 0s;
        }

        .bubbles span:nth-child(2) {
          left: 50%;
          animation-delay: 0.45s;
        }

        .bubbles span:nth-child(3) {
          left: 76%;
          animation-delay: 0.9s;
        }

        @keyframes bubbleUp {
          0% {
            transform: translateY(0);
            opacity: 0.9;
          }
          90% {
            opacity: 0.4;
          }
          100% {
            transform: translateY(-22px);
            opacity: 0;
          }
        }

        .action-layer {
          position: absolute;
          top: 30px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 3;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Chop */
        .chop-scene {
          position: relative;
          width: 120px;
          height: 70px;
        }

        .chop-board {
          position: absolute;
          bottom: 0;
          left: 10px;
          right: 10px;
          height: 14px;
          border-radius: 8px;
          background: #a16207;
          opacity: 0.75;
        }

        .chop-food {
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 22px;
        }

        .chop-knife {
          position: absolute;
          top: 0;
          left: 50%;
          font-size: 30px;
          transform-origin: top left;
          animation: chopMotion 0.7s ease-in-out infinite;
        }

        @keyframes chopMotion {
          0%,
          100% {
            transform: translate(-10px, 0) rotate(-25deg);
          }
          50% {
            transform: translate(-10px, 26px) rotate(-5deg);
          }
        }

        /* Mix */
        .mix-spoon {
          font-size: 34px;
          display: inline-block;
          animation: mixOrbit 1.1s linear infinite;
          transform-origin: 50% 140%;
        }

        @keyframes mixOrbit {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        /* Pour / Add */
        .drop-scene {
          position: relative;
          width: 60px;
          height: 70px;
        }

        .drop-emoji {
          position: absolute;
          left: 50%;
          font-size: 30px;
          transform: translateX(-50%);
          animation: dropBounce 1.6s ease-in-out infinite;
        }

        @keyframes dropBounce {
          0%,
          100% {
            top: 0;
            transform: translateX(-50%) rotate(0deg);
          }
          45% {
            top: 30px;
            transform: translateX(-50%) rotate(-22deg);
          }
          65% {
            top: 30px;
            transform: translateX(-50%) rotate(-22deg);
          }
        }

        .stream {
          position: absolute;
          top: 40px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 6px;
        }

        .stream span {
          width: 4px;
          height: 10px;
          border-radius: 999px;
          background: #fcd34d;
          animation: streamFall 0.8s linear infinite;
        }

        .stream span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .stream span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes streamFall {
          0% {
            transform: translateY(-6px);
            opacity: 0;
          }
          40% {
            opacity: 1;
          }
          100% {
            transform: translateY(30px);
            opacity: 0;
          }
        }

        /* Sprinkle */
        .sprinkle-scene {
          position: relative;
          width: 80px;
          height: 70px;
        }

        .sprinkle-hand {
          position: absolute;
          left: 50%;
          top: 0;
          font-size: 26px;
          transform: translateX(-50%);
          animation: sprinkleShake 0.9s ease-in-out infinite;
        }

        @keyframes sprinkleShake {
          0%,
          100% {
            transform: translateX(-50%) rotate(-6deg);
          }
          50% {
            transform: translateX(-50%) rotate(10deg);
          }
        }

        .particles {
          position: absolute;
          top: 26px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 8px;
        }

        .particles span {
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: #f8fafc;
          animation: particleFall 1s ease-in infinite;
        }

        .particles span:nth-child(2) {
          animation-delay: 0.15s;
        }
        .particles span:nth-child(3) {
          animation-delay: 0.3s;
        }
        .particles span:nth-child(4) {
          animation-delay: 0.45s;
        }
        .particles span:nth-child(5) {
          animation-delay: 0.6s;
        }

        @keyframes particleFall {
          0% {
            transform: translateY(-4px);
            opacity: 0;
          }
          40% {
            opacity: 1;
          }
          100% {
            transform: translateY(32px);
            opacity: 0;
          }
        }

        /* Serve */
        .serve-scene {
          position: relative;
          width: 90px;
          height: 60px;
        }

        .serve-plate {
          position: absolute;
          left: 50%;
          bottom: 0;
          font-size: 44px;
          transform: translateX(-50%);
        }

        .serve-food {
          position: absolute;
          left: 50%;
          font-size: 22px;
          animation: serveDrop 1.6s ease-in-out infinite;
        }

        @keyframes serveDrop {
          0% {
            top: -10px;
            transform: translateX(-50%) scale(0.7);
            opacity: 0;
          }
          40% {
            opacity: 1;
          }
          70%,
          100% {
            top: 6px;
            transform: translateX(-50%) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
