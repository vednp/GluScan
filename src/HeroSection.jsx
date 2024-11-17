import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Steps from "./Steps";

function HeroSection() {
  const [inival, SetInival] = useState("12");
  const [inivalHeart, SetInivalHeart] = useState("--");
  const [clickedStart, setClickedStart] = useState(false);
  const navigate = useNavigate();

  const handleStartClick = () => {
    setClickedStart(true);
    navigate("/analyze"); // Navigate to the VideoFrameAnalyzer component
  };

  return (
    <div className="p-10 text-white">
      <div className="text-4xl text-white sm:text-4xl lg:text-7xl font-semibold text-center">
        Check <span className="text-blue-500 font-bold">Glucose</span> level from your smartphone
      </div>

      <Steps />

      <div className="flex justify-center items-center mt-16 p-3 font-semibold">
        <div className="text-3xl text-center">↑ Swipe To Check ↑</div>
      </div>

      <div className="flex items-center justify-center mt-16">
        <div className="w-4/5 sm:2/3 flex justify-center items-center gap-2 flex-col p-4">
          {clickedStart ? (
            <div>
              <div>Measuring...</div>
            </div>
          ) : (
            <button
              onClick={handleStartClick}
              className="bg-green-400 w-32 rounded-lg text-black p-2"
            >
              Start
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default HeroSection;
