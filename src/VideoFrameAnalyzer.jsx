import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const VideoFrameAnalyzer = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [lineArr, setLineArr] = useState([]);
  const [chart, setChart] = useState(null);
  const [frameInfo, setFrameInfo] = useState({
    frameCount: 0,
    fps: 0,
    xMean: 0,
    videoTime: 0,
    frameTime: 0,
    signal: 0,
  });
  const [isReading, setIsReading] = useState(false);
  const [glucoseLevel, setGlucoseLevel] = useState(null);
  const [heartbeatCount, setHeartbeatCount] = useState(0);

  const MAX_LENGTH = 100;
  const DURATION = 100;
  const WINDOW_LENGTH = 300;
  const constraintsObj = {
    audio: false,
    video: {
      maxWidth: 1280,
      maxHeight: 720,
      frameRate: { ideal: 60 },
      facingMode: "environment",
    },
  };

  let acdc = Array(WINDOW_LENGTH).fill(0.5);
  let ac = Array(WINDOW_LENGTH).fill(0.5);
  let acWindow = 0.008;
  let acFrame = 0.008;
  let nFrame = 0;
  let isSignal = 0;

  const realTimeLineChart = () => {
    const margin = { top: 20, right: 20, bottom: 50, left: 50 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const chart = (selection) => {
      selection.each(function (data) {
        const x = d3.scaleTime().range([0, width]);
        const y = d3.scaleLinear().range([height, 0]);

        // Set up scales
        x.domain([d3.min(data, (d) => d.time), d3.max(data, (d) => d.time)]);
        y.domain([d3.min(data, (d) => d.x), d3.max(data, (d) => d.x)]);

        const svg = d3
          .select(this)
          .selectAll("svg")
          .data([data])
          .join("svg") // Ensures only one SVG exists
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom);

        const g = svg
          .selectAll("g")
          .data([data])
          .join("g")
          .attr("transform", `translate(${margin.left}, ${margin.top})`);

        // Clear and re-add axes
        g.selectAll(".x-axis").remove();
        g.selectAll(".y-axis").remove();
        g.append("g")
          .attr("class", "x-axis")
          .attr("transform", `translate(0,${height})`)
          .call(d3.axisBottom(x));
        g.append("g").attr("class", "y-axis").call(d3.axisLeft(y));

        // Define line generator
        const line = d3
          .line()
          .x((d) => x(d.time))
          .y((d) => y(d.x))
          .curve(d3.curveBasis);

        // Clear and redraw the line
        g.selectAll(".line").remove();
        g.append("path")
          .datum(data)
          .attr("class", "line")
          .attr("d", line)
          .style("stroke", "steelblue")
          .style("fill", "none")
          .style("stroke-width", 2);
      });
    };

    return chart;
  };

  useEffect(() => {
    const initializeChart = () => {
      const chartInstance = realTimeLineChart();

      // Render the chart with dummy data
      const chartDiv = d3.select("#chart");
      const initialData = []; // No dummy data initially
      chartDiv.datum(initialData).call(chartInstance);

      setChart(() => chartInstance);
    };

    initializeChart();
  }, []);

  useEffect(() => {
    const initializeVideo = async () => {
      const video = videoRef.current;
      try {
        const stream = await navigator.mediaDevices.getUserMedia(
          constraintsObj
        );
        video.srcObject = stream;
        video.play();
      } catch (error) {
        console.error("Error accessing camera:", error);
      }
    };
    initializeVideo();
  }, []);

  const handleFrameProcessing = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const processFrame = () => {
      if (video.readyState >= video.HAVE_CURRENT_DATA) {
        ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const frame = ctx.getImageData(
          0,
          0,
          video.videoWidth,
          video.videoHeight
        );

        const count = frame.data.length / 4;
        let rgbRed = 0;
        for (let i = 0; i < count; i++) {
          rgbRed += frame.data[i * 4];
        }

        const xMean = 1 - rgbRed / (count * 255);

        // Update the frame info
        setFrameInfo((prev) => ({
          ...prev,
          xMean,
          videoTime: video.currentTime.toFixed(2),
        }));

        // Update lineArr state
        setLineArr((prev) => {
          const newLineArr = [
            ...prev,
            { time: new Date(), x: xMean, signal: 0 }, // signal logic can be updated
          ];

          // Ensure data length doesn't exceed MAX_LENGTH
          if (newLineArr.length > MAX_LENGTH) {
            newLineArr.shift();
          }

          // Update D3 chart with new data
          if (chart) {
            d3.select("#chart").datum(newLineArr).call(chart);
          }

          return newLineArr;
        });
      }

      requestAnimationFrame(processFrame); // Continue the loop
    };

    processFrame();
  };

  const startReading = () => {
    setIsReading(true);
    setGlucoseLevel(null); // Reset glucose level before starting the reading

    setTimeout(() => {
      // Simulate the glucose reading after 40-50 seconds
      const randomGlucoseLevel =
        Math.floor(Math.random() * (140 - 80 + 1)) + 80;
      setGlucoseLevel(randomGlucoseLevel);

      // Simulate a heartbeat count based on fluctuations
      const heartbeat = lineArr.filter((data, index, arr) => {
        if (index === 0) return false;
        return Math.abs(data.x - arr[index - 1].x) > 0.05;
      }).length;
      setHeartbeatCount(heartbeat);
    }, Math.random() * 5000 + 40000); // Simulate after 40-50 seconds
  };

  const stopReading = () => {
    setIsReading(false);
  };

  const resetReading = () => {
    setIsReading(false);
    setGlucoseLevel(null);
    setHeartbeatCount(0);
    setLineArr([]);
  };

  useEffect(() => {
    handleFrameProcessing();
  }, []);

  // Adding useEffect to update the chart when lineArr changes
  useEffect(() => {
    if (chart && lineArr.length > 0) {
      d3.select("#chart").datum(lineArr).call(chart);
    }
  }, [lineArr, chart]); // This will run whenever lineArr changes

  return (
    <div className="p-4 space-y-4 bg-gray-100 min-h-screen">
      <div className="flex flex-col items-center">
        <h1 className="text-xl font-bold text-gray-800">
          Real-Time Video Frame Analysis
        </h1>
        {isReading && (
          <div className="mt-4 text-lg text-yellow-600">
            <p>
              Hold the camera steady and keep your finger in front of the
              camera.
            </p>
            <p>Stable position helps for an accurate reading.</p>
          </div>
        )}
      </div>

      <video ref={videoRef} id="video" style={{ display: "none" }}></video>
      <canvas
        ref={canvasRef}
        id="output-canvas"
        className="border border-gray-300 shadow-md"
      ></canvas>

      <div id="chart" className="w-full h-96 bg-gray-200"></div>

      <div className="text-gray-800">
        <p>Frame Count: {frameInfo.frameCount}</p>
        <p>FPS: {frameInfo.fps}</p>
        <p>Video Time: {frameInfo.videoTime}</p>
        <p>X Mean: {frameInfo.xMean.toFixed(4)}</p>
        <p>Signal: {frameInfo.signal}</p>
        {glucoseLevel !== null && <p>Glucose Level: {glucoseLevel} mg/dL</p>}
        {heartbeatCount > 0 && <p>Heartbeat Count: {heartbeatCount}</p>}
      </div>

      {!isReading ? (
        <button
          onClick={startReading}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Start Reading
        </button>
      ) : (
        <>
          <button
            onClick={stopReading}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded"
          >
            Stop Reading
          </button>
          <button
            onClick={resetReading}
            className="mt-4 px-4 py-2 bg-gray-500 text-white rounded"
          >
            Reset
          </button>
        </>
      )}
    </div>
  );
};

export default VideoFrameAnalyzer;
