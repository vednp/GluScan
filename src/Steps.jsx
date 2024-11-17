import React from "react";

function Steps() {
  return (
    <div className="">
      <div className="mt-16 w-full p-4 bg-slate-200 text-black rounded-lg border-2 border-black">
        <div className="font-semibold text-2xl">Steps: </div>
        <div className="mt-4">
          1. Cover the phone camera with index finger, and the torch with middle
          finger.
        </div>
        <div className="mt-1">
          2. Wait for 30-40 sec for the model to process.
        </div>
        <div className="mt-1">3. Check the readings.</div>
        <div className="mt-1">
          4. Clear the camera with a piece of cloth to check again.{" "}
        </div>
      </div>
    </div>
  );
}

export default Steps;
