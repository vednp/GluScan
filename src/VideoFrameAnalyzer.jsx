import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const VideoFrameAnalyzer = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [lineArr, setLineArr] = useState([]);
  const [chart, setChart] = useState(null);
  const [isReading, setIsReading] = useState(false);
  const [glucoseLevel, setGlucoseLevel] = useState(null);
  const [predictedHeartbeat, setPredictedHeartbeat] = useState(null);
  const [heartbeatPulse, setHeartbeatPulse] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [timer, setTimer] = useState(45);
  const [handRemoved, setHandRemoved] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  const MAX_LENGTH = 150;
  const constraintsObj = {
    audio: false,
    video: {
      frameRate: { ideal: 60 },
      facingMode: 'environment',
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
  };

  // Chart creation function
  const realTimeLineChart = () => {
    const margin = { top: 20, right: 20, bottom: 50, left: 50 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    return (selection) => {
      selection.each(function (data) {
        const svg = d3
          .select(this)
          .selectAll('svg')
          .data([data])
          .join('svg')
          .attr('width', width + margin.left + margin.right)
          .attr('height', height + margin.top + margin.bottom);

        const g = svg
          .selectAll('g')
          .data([data])
          .join('g')
          .attr('transform', `translate(${margin.left}, ${margin.top})`);

        const x = d3.scaleTime().range([0, width]);
        const y = d3.scaleLinear().range([height, 0]);

        // Dynamic domain based on data
        x.domain(d3.extent(data, (d) => d.time));
        const yExtent = d3.extent(data, (d) => d.value);
        if (yExtent[0] === yExtent[1]) {
          // Avoid zero range
          yExtent[0] = yExtent[0] - 0.001;
          yExtent[1] = yExtent[1] + 0.001;
        }
        y.domain(yExtent);

        g.selectAll('.x-axis').remove();
        g.selectAll('.y-axis').remove();

        g.append('g')
          .attr('class', 'x-axis')
          .attr('transform', `translate(0,${height})`)
          .call(d3.axisBottom(x));

        g.append('g')
          .attr('class', 'y-axis')
          .call(d3.axisLeft(y));

        const line = d3
          .line()
          .x((d) => x(d.time))
          .y((d) => y(d.value))
          .curve(d3.curveMonotoneX);

        g.selectAll('.line').remove();
        g.append('path')
          .datum(data)
          .attr('class', 'line')
          .attr('d', line)
          .style('stroke', '#ff4444')
          .style('stroke-width', 2.5)
          .style('fill', 'none');
      });
    };
  };

  useEffect(() => {
    const chartInstance = realTimeLineChart();
    setChart(() => chartInstance);
    d3.select('#chart').datum([]).call(chartInstance);

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    const initializeVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraintsObj);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
      }
    };
    initializeVideo();
  }, []);

  useEffect(() => {
    let animationFrameId;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');

    const processFrame = () => {
      if (video.readyState >= video.HAVE_CURRENT_DATA && isReading) {
        // Draw the video frame into canvas
        if (!canvas.width || !canvas.height) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = frame.data;

        // Define a smaller ROI (e.g., 50x50 pixels at center)
        const roiSize = 50;
        const startX = Math.floor((canvas.width - roiSize) / 2);
        const startY = Math.floor((canvas.height - roiSize) / 2);

        let redSum = 0;
        let greenSum = 0;
        let blueSum = 0;
        let totalPixels = 0;

        for (let y = startY; y < startY + roiSize; y++) {
          for (let x = startX; x < startX + roiSize; x++) {
            const index = (y * canvas.width + x) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];

            redSum += r;
            greenSum += g;
            blueSum += b;
            totalPixels++;
          }
        }

        const avgRed = redSum / totalPixels;
        const avgGreen = greenSum / totalPixels;
        const avgBlue = blueSum / totalPixels;

        // Calculate a red ratio to highlight subtle changes
        const redRatio = avgRed / (avgRed + avgGreen + avgBlue);

        // Push new data point
        setLineArr(prev => {
          const newPoint = {
            time: new Date(),
            value: redRatio
          };

          const newArr = [...prev, newPoint];
          if (newArr.length > MAX_LENGTH) newArr.shift();

          // Update chart
          d3.select('#chart').datum(newArr).call(chart);
          calculateHeartRate(newArr);
          return newArr;
        });
      }
      animationFrameId = requestAnimationFrame(processFrame);
    };

    if (isReading) {
      processFrame();
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isReading, chart]);

  const calculateHeartRate = (data) => {
    // Need enough data points
    if (data.length < 30) return;

    const values = data.map(d => d.value);
    const peaks = findPeaks(values);
    const timeSpan = (data[data.length - 1].time - data[0].time) / 1000;

    if (timeSpan > 0 && peaks.length > 1) {
      const heartRate = Math.round((peaks.length * 60) / timeSpan);
      const boundedHeartRate = Math.max(40, Math.min(180, heartRate));
      setPredictedHeartbeat(boundedHeartRate);
      setHeartbeatPulse(true);
      setTimeout(() => setHeartbeatPulse(false), 200);
    }
  };

  const findPeaks = (arr) => {
    const peaks = [];
    const minDistance = 8;
    // Threshold might need tweaking. Lower if too few peaks
    const dynamicThreshold = (d3.mean(arr) || 0) + (d3.deviation(arr) || 0) * 0.5;

    for (let i = 2; i < arr.length - 2; i++) {
      if (arr[i] > dynamicThreshold && arr[i] > arr[i-1] && arr[i] > arr[i+1]) {
        if (peaks.length === 0 || (i - peaks[peaks.length - 1]) >= minDistance) {
          peaks.push(i);
        }
      }
    }

    return peaks;
  };

  const startReading = () => {
    setIsReading(true);
    setTimer(45);
    setHandRemoved(false);
    setShowInstructions(false);
    setLineArr([]);
    setPredictedHeartbeat(null);
    setGlucoseLevel(null);

    const countdown = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 0) {
          clearInterval(countdown);
          // Simulate a glucose reading
          const randomGlucose = Math.floor(Math.random() * 61) + 80;
          setGlucoseLevel(randomGlucose);
          setIsReading(false);
          setShowResults(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopReading = () => {
    setIsReading(false);
    setShowResults(false);
    setHandRemoved(true);
    setLineArr([]);
  };

  const getGlucoseCategory = (glucose) => {
    if (glucose < 70) return 'Low';
    if (glucose <= 99) return 'Normal';
    if (glucose <= 125) return 'High (Prediabetes)';
    return 'High (Diabetes)';
  };

  return (
    <div className="p-4 space-y-4 bg-gray-100 min-h-screen">
      <div className="flex items-center justify-center">
        <video ref={videoRef} style={{ display: 'none' }} />
        <canvas ref={canvasRef} className="border border-gray-300 shadow-md" />
        {isReading && heartbeatPulse && (
          <div className="ml-4 flex flex-col items-center animate-pulse">
            <div className="w-20 h-20 bg-red-500 rounded-full"></div>
            <p className="text-lg text-red-600">Pulse Detected</p>
          </div>
        )}
      </div>

      <div id="chart" className="w-full h-96 bg-white rounded-lg shadow-md p-4"></div>

      {showResults && (
        <div className="mt-4 text-center">
          <p className="text-2xl text-green-600">Glucose Level: {glucoseLevel} mg/dL</p>
          {predictedHeartbeat && <p className="text-2xl">Heart Rate: {predictedHeartbeat} BPM</p>}
          <p className="text-lg">Blood Glucose Category: {getGlucoseCategory(glucoseLevel)}</p>
          <table className="mt-4 mx-auto table-auto border-collapse">
            <thead>
              <tr>
                <th className="border px-4 py-2">Range</th>
                <th className="border px-4 py-2">Category</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border px-4 py-2">Less than 70 mg/dL</td>
                <td className="border px-4 py-2">Low</td>
              </tr>
              <tr>
                <td className="border px-4 py-2">70 - 99 mg/dL</td>
                <td className="border px-4 py-2">Normal</td>
              </tr>
              <tr>
                <td className="border px-4 py-2">100 - 125 mg/dL</td>
                <td className="border px-4 py-2">High (Prediabetes)</td>
              </tr>
              <tr>
                <td className="border px-4 py-2">126 mg/dL or higher</td>
                <td className="border px-4 py-2">High (Diabetes)</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {showInstructions && (
        <div className="text-center text-lg text-blue-600">
          <p>Place your index finger on the camera for 45 seconds.</p>
          <p>Ensure to cover the flashlight with your finger.</p>
        </div>
      )}

      <div className="text-center">
        {!isReading && !handRemoved && (
          <button
            onClick={startReading}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Start Reading
          </button>
        )}

        {isReading && (
          <div>
            <p className="text-xl mb-4">{`Please hold your finger still. Time remaining: ${timer}s`}</p>
            <button
              onClick={stopReading}
              className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Stop
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoFrameAnalyzer;
