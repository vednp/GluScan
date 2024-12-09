import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

// Simple FFT Implementation (Cooley-Tukey)
function fft(input) {
  const n = input.length;
  if (n <= 1) return input;
  
  const even = fft(input.filter((x, i) => i % 2 === 0));
  const odd = fft(input.filter((x, i) => i % 2 !== 0));
  
  const combined = new Array(n).fill([0,0]);
  for (let k = 0; k < n/2; k++) {
    const t = complexMul(odd[k], complexExp(-2*Math.PI*k/n));
    combined[k] = complexAdd(even[k], t);
    combined[k + n/2] = complexSub(even[k], t);
  }
  return combined;
}

// Complex arithmetic helpers
function complexAdd(a, b) { return [a[0]+b[0], a[1]+b[1]]; }
function complexSub(a, b) { return [a[0]-b[0], a[1]-b[1]]; }
function complexMul(a, b) { 
  return [a[0]*b[0]-a[1]*b[1], a[0]*b[1]+a[1]*b[0]];
}
function complexExp(theta) { return [Math.cos(theta), Math.sin(theta)]; }

const VideoFrameAnalyzer = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // States
  const [lineArr, setLineArr] = useState([]);
  const [chart, setChart] = useState(null);
  const [freqChart, setFreqChart] = useState(null);
  const [isReading, setIsReading] = useState(false);
  const [glucoseLevel, setGlucoseLevel] = useState(null);
  const [predictedHeartbeat, setPredictedHeartbeat] = useState(null);
  const [heartbeatPulse, setHeartbeatPulse] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [timer, setTimer] = useState(45);
  const [handRemoved, setHandRemoved] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [heartCondition, setHeartCondition] = useState(null);
  const [hrv, setHRV] = useState(null);
  const [stressLevel, setStressLevel] = useState(null);

  // Advanced controls
  const [roiSize, setRoiSize] = useState(50);
  const [thresholdFactor, setThresholdFactor] = useState(0.5);
  const [applyFilter, setApplyFilter] = useState(false);

  // i18n 
  const [lang, setLang] = useState('en');

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

  const i18n = {
    en: {
        instructions: "Place your index finger on the camera for 45 seconds. Ensure to cover the flashlight. This is not medical advice.",
        startReading: "Start Reading",
        stop: "Stop",
        holdStill: "Please hold your finger still.",
        pulseDetected: "Pulse Detected",
        glucoseLevel: "Estimated Glucose Level",
        heartRate: "Heart Rate",
        condition: "Condition",
        low: "Low",
        normal: "Normal",
        prediabetes: "High (Prediabetes)",
        diabetes: "High (Diabetes)",
        range: "Range",
        category: "Category",
        disclaimer: "**Disclaimer:** This is a fictional estimation and not medical advice.",
        savedResults: "Past Measurements",
        signalQuality: "Signal Quality",
        poorSignal: "Poor signal. Try adjusting your finger.",
        roiLabel: "ROI Size",
        thresholdLabel: "Threshold Factor",
        filterLabel: "Apply Band-Pass Filter",
        langLabel: "Language",
        hrvar: "HR Variability",
        stress: "Estimated Stress Level",
    },
    es: {
        instructions: "Coloca tu dedo índice en la cámara durante 45 segundos. Asegúrate de cubrir la linterna. Esto no es un consejo médico.",
        startReading: "Iniciar Lectura",
        stop: "Detener",
        holdStill: "Por favor mantén tu dedo quieto.",
        pulseDetected: "Pulso Detectado",
        glucoseLevel: "Nivel Estimado de Glucosa",
        heartRate: "Frecuencia Cardíaca",
        condition: "Condición",
        low: "Bajo",
        normal: "Normal",
        prediabetes: "Alto (Prediabetes)",
        diabetes: "Alto (Diabetes)",
        range: "Rango",
        category: "Categoría",
        disclaimer: "**Descargo de responsabilidad:** Esto es una estimación ficticia y no es consejo médico.",
        savedResults: "Resultados Pasados",
        signalQuality: "Calidad de la Señal",
        poorSignal: "Señal pobre. Ajusta tu dedo.",
        roiLabel: "Tamaño ROI",
        thresholdLabel: "Factor Umbral",
        filterLabel: "Aplicar Filtro",
        langLabel: "Idioma",
        hrvar: "Variabilidad FC",
        stress: "Nivel de Estrés Estimado",
    },
    hi: {
        instructions: "कृपया अपनी इंडेक्स उंगली को कैमरे पर 45 सेकंड तक रखें। फ्लैशलाइट को कवर करना सुनिश्चित करें। यह चिकित्सा सलाह नहीं है।",
        startReading: "पढ़ाई शुरू करें",
        stop: "रोकें",
        holdStill: "कृपया अपनी उंगली को स्थिर रखें।",
        pulseDetected: "नाड़ी का पता चला",
        glucoseLevel: "अनुमानित ग्लूकोज स्तर",
        heartRate: "हृदय दर",
        condition: "स्थिति",
        low: "कम",
        normal: "सामान्य",
        prediabetes: "उच्च (प्रेडीबिटीज)",
        diabetes: "उच्च (डायबिटीज)",
        range: "रेंज",
        category: "श्रेणी",
        disclaimer: "**अस्वीकरण:** यह एक काल्पनिक अनुमान है और चिकित्सा सलाह नहीं है।",
        savedResults: "पूर्व के माप",
        signalQuality: "सिग्नल गुणवत्ता",
        poorSignal: "सिग्नल कमजोर है। कृपया अपनी उंगली को समायोजित करें।",
        roiLabel: "ROI आकार",
        thresholdLabel: "थ्रेशोल्ड फैक्टर",
        filterLabel: "बैंड-पास फ़िल्टर लागू करें",
        langLabel: "भाषा",
        hrvar: "HR विविधता",
        stress: "अनुमानित तनाव स्तर",
    },
    mr: {
        instructions: "कृपया आपल्या निर्देशांक बोटाला 45 सेकंदांसाठी कॅमेऱ्यावर ठेवा. फ्लॅशलाइट कव्हर करा. ही वैद्यकीय सल्ला नाही.",
        startReading: "वाचन सुरू करा",
        stop: "थांबवा",
        holdStill: "कृपया आपली बोट स्थिर ठेवा.",
        pulseDetected: "नाडी शोधली",
        glucoseLevel: "अनुमानित ग्लूकोज स्तर",
        heartRate: "हृदय गती",
        condition: "स्थिती",
        low: "कमी",
        normal: "सामान्य",
        prediabetes: "उच्च (प्रेडीबिटीज)",
        diabetes: "उच्च (डायबिटीज)",
        range: "रेंज",
        category: "वर्ग",
        disclaimer: "**अस्वीकरण:** हे एक काल्पनिक अंदाज आहे आणि वैद्यकीय सल्ला नाही.",
        savedResults: "माजी मापने",
        signalQuality: "सिग्नल गुणवत्ता",
        poorSignal: "सिग्नल कमी आहे. कृपया आपली बोट समायोजित करा.",
        roiLabel: "ROI आकार",
        thresholdLabel: "थ्रेशोल्ड घटक",
        filterLabel: "बँड-पास फिल्टर लागू करा",
        langLabel: "भाषा",
        hrvar: "HR विविधता",
        stress: "अनुमानित तणाव स्तर",
    },
    fr: {
        instructions: "Placez votre doigt indice sur la caméra pendant 45 secondes. Assurez-vous de couvrir le flash. Ceci n'est pas un conseil médical.",
        startReading: "Commencer la lecture",
        stop: "Arrêter",
        holdStill: "Veuillez maintenir votre doigt immobile.",
        pulseDetected: "Pouls détecté",
        glucoseLevel: "Niveau estimé de glucose",
        heartRate: "Fréquence cardiaque",
        condition: "État",
        low: "Bas",
        normal: "Normal",
        prediabetes: "Élevé (Pré-diabète)",
        diabetes: "Élevé (Diabète)",
        range: "Plage",
        category: "Catégorie",
        disclaimer: "**Avertissement :** Il s'agit d'une estimation fictive et non d'un conseil médical.",
        savedResults: "Mesures passées",
        signalQuality: "Qualité du signal",
        poorSignal: "Signal faible. Essayez d'ajuster votre doigt.",
        roiLabel: "Taille ROI",
        thresholdLabel: "Facteur seuil",
        filterLabel: "Appliquer un filtre passe-bande",
        langLabel: "Langue",
        hrvar: "Variabilité de la FC",
        stress: "Niveau estimé de stress",
    },
    de: {
        instructions: "Legen Sie Ihren Zeigefinger 45 Sekunden lang auf die Kamera. Stellen Sie sicher, dass Sie den Blitz abdecken. Dies ist keine medizinische Beratung.",
        startReading: "Messung starten",
        stop: "Stoppen",
        holdStill: "Bitte halten Sie Ihren Finger still.",
        pulseDetected: "Puls erkannt",
        glucoseLevel: "Geschätzter Blutzuckerwert",
        heartRate: "Herzfrequenz",
        condition: "Zustand",
        low: "Niedrig",
        normal: "Normal",
        prediabetes: "Hoch (Prädiabetes)",
        diabetes: "Hoch (Diabetes)",
        range: "Bereich",
        category: "Kategorie",
        disclaimer: "**Haftungsausschluss:** Dies ist eine fiktive Schätzung und keine medizinische Beratung.",
        savedResults: "Vergangene Messungen",
        signalQuality: "Signalqualität",
        poorSignal: "Schwaches Signal. Versuchen Sie, Ihren Finger anzupassen.",
        roiLabel: "ROI-Größe",
        thresholdLabel: "Schwellenwertfaktor",
        filterLabel: "Bandpassfilter anwenden",
        langLabel: "Sprache",
        hrvar: "HR-Variabilität",
        stress: "Geschätztes Stressniveau",
    },
    it: {
        instructions: "Posiziona il dito indice sulla fotocamera per 45 secondi. Assicurati di coprire la luce del flash. Questo non è un consiglio medico.",
        startReading: "Inizia la lettura",
        stop: "Ferma",
        holdStill: "Per favore tieni il dito fermo.",
        pulseDetected: "Impulso rilevato",
        glucoseLevel: "Livello stimato di glucosio",
        heartRate: "Frequenza cardiaca",
        condition: "Condizione",
        low: "Basso",
        normal: "Normale",
        prediabetes: "Alto (Prediabete)",
        diabetes: "Alto (Diabete)",
        range: "Intervallo",
        category: "Categoria",
        disclaimer: "**Disclaimer:** Questa è una stima fittizia e non è un consiglio medico.",
        savedResults: "Misurazioni precedenti",
        signalQuality: "Qualità del segnale",
        poorSignal: "Segnale debole. Prova a regolare il dito.",
        roiLabel: "Dimensione ROI",
        thresholdLabel: "Fattore di soglia",
        filterLabel: "Applica filtro passa-banda",
        langLabel: "Lingua",
        hrvar: "Variabilità della FC",
        stress: "Livello di stress stimato",
    },
    pt: {
        instructions: "Coloque seu dedo indicador na câmera por 45 segundos. Certifique-se de cobrir o flash. Isto não é um conselho médico.",
        startReading: "Iniciar leitura",
        stop: "Parar",
        holdStill: "Por favor, mantenha o dedo imóvel.",
        pulseDetected: "Pulso detectado",
        glucoseLevel: "Nível estimado de glicose",
        heartRate: "Taxa de batimento cardíaco",
        condition: "Condição",
        low: "Baixo",
        normal: "Normal",
        prediabetes: "Alto (Pré-diabetes)",
        diabetes: "Alto (Diabetes)",
        range: "Faixa",
        category: "Categoria",
        disclaimer: "**Isenção de responsabilidade:** Esta é uma estimativa fictícia e não é aconselhamento médico.",
        savedResults: "Medições passadas",
        signalQuality: "Qualidade do sinal",
        poorSignal: "Sinal fraco. Tente ajustar o dedo.",
        roiLabel: "Tamanho ROI",
        thresholdLabel: "Fator limiar",
        filterLabel: "Aplicar filtro passa-banda",
        langLabel: "Idioma",
        hrvar: "Variabilidade da FC",
        stress: "Nível estimado de estresse",
    },
    zh: {
        instructions: "将食指放在摄像头上45秒。确保遮住闪光灯。这不是医疗建议。",
        startReading: "开始测量",
        stop: "停止",
        holdStill: "请保持手指静止。",
        pulseDetected: "检测到脉搏",
        glucoseLevel: "估计的血糖水平",
        heartRate: "心率",
        condition: "状况",
        low: "低",
        normal: "正常",
        prediabetes: "高（糖尿病前期）",
        diabetes: "高（糖尿病）",
        range: "范围",
        category: "类别",
        disclaimer: "**免责声明：** 这只是一个虚构的估算，不是医疗建议。",
        savedResults: "历史测量",
        signalQuality: "信号质量",
        poorSignal: "信号较差。请调整手指。",
        roiLabel: "ROI大小",
        thresholdLabel: "阈值因子",
        filterLabel: "应用带通滤波器",
        langLabel: "语言",
        hrvar: "心率变异性",
        stress: "估计的压力水平",
    },
    ja: {
        instructions: "45秒間、カメラに人差し指を置いてください。フラッシュライトをカバーしてください。これは医療アドバイスではありません。",
        startReading: "計測を開始",
        stop: "停止",
        holdStill: "指を動かさずに保持してください。",
        pulseDetected: "脈拍が検出されました",
        glucoseLevel: "推定血糖値",
        heartRate: "心拍数",
        condition: "状態",
        low: "低い",
        normal: "正常",
        prediabetes: "高い（前糖尿病）",
        diabetes: "高い（糖尿病）",
        range: "範囲",
        category: "カテゴリー",
        disclaimer: "**免責事項：** これは架空の推定値であり、医療アドバイスではありません。",
        savedResults: "過去の測定結果",
        signalQuality: "信号の品質",
        poorSignal: "信号が弱いです。指を調整してください。",
        roiLabel: "ROIサイズ",
        thresholdLabel: "閾値係数",
        filterLabel: "バンドパスフィルターを適用",
        langLabel: "言語",
        hrvar: "心拍変動",
        stress: "推定ストレスレベル",
    }
};


  
  // Local storage for history
  const [history, setHistory] = useState([]);
  
  useEffect(() => {
    const hist = localStorage.getItem('measurementHistory');
    if (hist) {
      setHistory(JSON.parse(hist));
    }
  }, []);
  
  const saveToHistory = (reading) => {
    const newHistory = [...history, reading];
    localStorage.setItem('measurementHistory', JSON.stringify(newHistory));
    setHistory(newHistory);
  };

  // Time domain chart
  const createTimeChart = () => {
    const margin = { top: 20, right: 20, bottom: 50, left: 50 };
    const width = 800 - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;
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

        x.domain(d3.extent(data, (d) => d.time));
        const yExtent = d3.extent(data, (d) => d.value);
        if (yExtent[0] === yExtent[1]) {
          yExtent[0] -= 0.001;
          yExtent[1] += 0.001;
        }
        y.domain(yExtent);

        g.selectAll('.x-axis').remove();
        g.selectAll('.y-axis').remove();
        g.selectAll('.line').remove();
        g.selectAll('.peak-circle').remove();

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

        g.append('path')
          .datum(data)
          .attr('class', 'line')
          .attr('d', line)
          .style('stroke', '#ff4444')
          .style('stroke-width', 2.5)
          .style('fill', 'none');

        // Draw peaks if we have them
        const peaks = findPeaks(data.map(d => d.value));
        peaks.forEach(idx => {
          g.append('circle')
            .attr('class', 'peak-circle')
            .attr('cx', x(data[idx].time))
            .attr('cy', y(data[idx].value))
            .attr('r', 4)
            .style('fill', 'blue');
        });
      });
    };
  };

  // Frequency domain chart
  const createFreqChart = () => {
    const margin = { top: 20, right: 20, bottom: 50, left: 50 };
    const width = 800 - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

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

        const freqs = data.map((d, i) => i / data.length); // normalized freq
        const yVals = data.map(d => Math.sqrt(d[0]*d[0] + d[1]*d[1]));

        const x = d3.scaleLinear().range([0, width]).domain([0, 0.5]); // Nyquist at 0.5
        const y = d3.scaleLinear().range([height, 0]).domain([0, d3.max(yVals)||1]);

        g.selectAll('.x-axis').remove();
        g.selectAll('.y-axis').remove();
        g.selectAll('.freq-line').remove();

        g.append('g')
          .attr('class', 'x-axis')
          .attr('transform', `translate(0,${height})`)
          .call(d3.axisBottom(x));

        g.append('g')
          .attr('class', 'y-axis')
          .call(d3.axisLeft(y));

        const line = d3.line()
          .x((d, i) => x(freqs[i]))
          .y((d, i) => y(yVals[i]))
          .curve(d3.curveMonotoneX);

        g.append('path')
          .datum(data)
          .attr('class', 'freq-line')
          .attr('d', line)
          .style('stroke', 'green')
          .style('stroke-width', 2.5)
          .style('fill', 'none');
      });
    };
  };

  useEffect(() => {
    const chartInstance = createTimeChart();
    setChart(() => chartInstance);
    d3.select('#timechart').datum([]).call(chartInstance);

    const freqChartInstance = createFreqChart();
    setFreqChart(() => freqChartInstance);
    d3.select('#freqchart').datum([]).call(freqChartInstance);

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
  }, [constraintsObj]);

  useEffect(() => {
    let animationFrameId;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');

    const processFrame = () => {
      if (video.readyState >= video.HAVE_CURRENT_DATA && isReading) {
        if (!canvas.width || !canvas.height) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = frame.data;

        const startX = Math.floor((canvas.width - roiSize) / 2);
        const startY = Math.floor((canvas.height - roiSize) / 2);

        let redSum = 0, greenSum = 0, blueSum = 0, totalPixels = 0;

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

        const redRatio = avgRed / (avgRed + avgGreen + avgBlue);

        setLineArr(prev => {
          const newPoint = {
            time: new Date(),
            value: redRatio
          };

          const newArr = [...prev, newPoint];
          if (newArr.length > MAX_LENGTH) newArr.shift();

          // Update time-domain chart
          d3.select('#timechart').datum(newArr).call(chart);

          // Frequency domain analysis
          const vals = newArr.map(d => d.value);
          if (vals.length > 1 && freqChart) {
            let padded = vals;
            // zero-pad to next power of two for FFT
            const size = Math.pow(2, Math.ceil(Math.log2(vals.length)));
            while (padded.length < size) padded.push(0);
            const complexInput = padded.map(v => [v,0]);
            let freqData = fft(complexInput);

            // Apply band-pass filter if enabled
            if (applyFilter) {
              // Typical heart rate frequency: ~1 to 3 Hz. Here we assume 60fps (~1 sec 60 samples)
              // frequency index * (frame_rate / N) = freq in Hz approx
              // We'll just zero out outside 0.7Hz - 3Hz
              const frameRate = 60; 
              for (let i=0; i<freqData.length; i++) {
                const freqHz = i * (frameRate / freqData.length);
                if (freqHz < 0.7 || freqHz > 3) {
                  freqData[i] = [0,0];
                }
              }
            }

            d3.select('#freqchart').datum(freqData).call(freqChart);
          }

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
  }, [isReading, chart, freqChart, roiSize, thresholdFactor, applyFilter]);

  const findPeaks = (arr) => {
    const peaks = [];
    const minDistance = 8;
    const mean = d3.mean(arr) || 0;
    const dev = d3.deviation(arr) || 0;
    const dynamicThreshold = mean + dev * thresholdFactor;

    for (let i = 2; i < arr.length - 2; i++) {
      if (arr[i] > dynamicThreshold && arr[i] > arr[i-1] && arr[i] > arr[i+1]) {
        if (peaks.length === 0 || (i - peaks[peaks.length - 1]) >= minDistance) {
          peaks.push(i);
        }
      }
    }
    return peaks;
  };

  const calculateHeartRate = (data) => {
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

      guessGlucoseFromHeartRate(boundedHeartRate);
      detectHeartConditions(boundedHeartRate, data, peaks);
    }
  };

  // Fictional logic: guess glucose based on HR
  const guessGlucoseFromHeartRate = (hr) => {
    let guess;
    if (hr > 120) {
      guess = Math.floor(Math.random() * 31) + 120; 
    } else if (hr < 60) {
      guess = Math.floor(Math.random() * 20) + 60;
    } else {
      guess = Math.floor(Math.random() * 30) + 90;
    }
    setGlucoseLevel(guess);
  };

  // Fictional logic: detect heart conditions & HRV
  const detectHeartConditions = (heartRate, data, peaks) => {
    let condition = null;

    if (heartRate < 60) {
      condition = 'Bradycardia (Low Heart Rate)';
    } else if (heartRate > 100) {
      condition = 'Tachycardia (High Heart Rate)';
    }

    let intervals = [];
    if (peaks.length > 2) {
      for (let i = 1; i < peaks.length; i++) {
        const t1 = data[peaks[i]].time;
        const t0 = data[peaks[i-1]].time;
        intervals.push((t1 - t0));
      }

      const meanInt = d3.mean(intervals);
      const stdInt = d3.deviation(intervals);
      // Arrhythmia guess
      if (stdInt > meanInt * 0.2) {
        condition = 'Possible Arrhythmia';
      }

      setHRV(Math.round(stdInt)); 
      // Fictional stress level: higher std dev = higher stress
      setStressLevel(stdInt > 100 ? 'High' : 'Normal');
    }

    setHeartCondition(condition);
  };

  const startReading = () => {
    setIsReading(true);
    setTimer(45);
    setHandRemoved(false);
    setShowInstructions(false);
    setLineArr([]);
    setPredictedHeartbeat(null);
    setGlucoseLevel(null);
    setHeartCondition(null);
    setShowResults(false);
    setHRV(null);
    setStressLevel(null);

    const countdown = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 0) {
          clearInterval(countdown);
          setIsReading(false);
          setShowResults(true);
          if (predictedHeartbeat && glucoseLevel) {
            saveToHistory({
              time: new Date().toLocaleString(),
              heartRate: predictedHeartbeat,
              glucose: glucoseLevel,
              condition: heartCondition
            });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopReading = () => {
    setIsReading(false);
    setShowResults(true);
    setHandRemoved(true);
    if (predictedHeartbeat && glucoseLevel) {
      saveToHistory({
        time: new Date().toLocaleString(),
        heartRate: predictedHeartbeat,
        glucose: glucoseLevel,
        condition: heartCondition
      });
    }
  };

  const getGlucoseCategory = (glucose) => {
    const { low, normal, prediabetes, diabetes } = i18n[lang];
    if (glucose < 70) return low;
    if (glucose <= 99) return normal;
    if (glucose <= 125) return prediabetes;
    return diabetes;
  };

  const signalQuality = () => {
    if (lineArr.length < 10) return 'N/A';
    const vals = lineArr.map(d => d.value);
    const dev = d3.deviation(vals);
    // If no variation, poor signal
    if (dev < 0.0005) return i18n[lang].poorSignal;
    return `${i18n[lang].signalQuality}: Good`;
  };

  return (
    <div className="p-4 space-y-4 bg-gray-100 min-h-screen" aria-label="Video Frame Analyzer">
      <div className="text-right">
        <label htmlFor="lang-select">{i18n[lang].langLabel}: </label>
        <select id="lang-select" onChange={(e) => setLang(e.target.value)} value={lang}>
        <option value="en">English</option>
<option value="hi">हिन्दी (Hindi)</option>
<option value="mr">मराठी (Marathi)</option>
<option value="es">Español (Spanish)</option>
<option value="fr">Français (French)</option>
<option value="de">Deutsch (German)</option>
<option value="it">Italiano (Italian)</option>
<option value="pt">Português (Portuguese)</option>
<option value="zh">简体中文 (Simplified Chinese)</option>
<option value="ja">日本語 (Japanese)</option>

        </select>
      </div>

      <div className="flex items-center justify-center">
        <video ref={videoRef} style={{ display: 'none' }} />
        <canvas ref={canvasRef} className="border border-gray-300 shadow-md" aria-label="Video Canvas" />
        {isReading && heartbeatPulse && (
          <div className="ml-4 flex flex-col items-center animate-pulse" aria-label="Pulse Indicator">
            <div className="w-20 h-20 bg-red-500 rounded-full"></div>
            <p className="text-lg text-red-600">{i18n[lang].pulseDetected}</p>
          </div>
        )}
      </div>

      <div className="flex flex-row space-x-4">
        <div className="relative" id="timechart" aria-label="Time Domain Chart" style={{background:'#fff', borderRadius:'8px', padding:'10px'}}></div>
        <div className="relative" id="freqchart" aria-label="Frequency Domain Chart" style={{background:'#fff', borderRadius:'8px', padding:'10px'}}></div>
      </div>
      <div className="text-sm text-gray-600 flex justify-between items-center">
        <span>{signalQuality()}</span>
        {isReading && (
          <div className="flex items-center space-x-2">
            <div className="w-full bg-gray-300 rounded h-2.5 dark:bg-gray-700" style={{width:'200px'}}>
              <div className="bg-blue-600 h-2.5 rounded" style={{width:`${(timer/45)*100}%`}}></div>
            </div>
            <p className="text-xl">{`${i18n[lang].holdStill} ${timer}s`}</p>
          </div>
        )}
      </div>

      {showResults && (
        <div className="mt-4 text-center bg-white p-4 rounded shadow" aria-label="Results Section">
          {glucoseLevel && (
            <>
              <p className="text-2xl text-green-600">{i18n[lang].glucoseLevel}: {glucoseLevel} mg/dL</p>
              <p className="text-lg">{i18n[lang].category}: {getGlucoseCategory(glucoseLevel)}</p>
            </>
          )}
          {predictedHeartbeat && <p className="text-2xl">{i18n[lang].heartRate}: {predictedHeartbeat} BPM</p>}
          {heartCondition && <p className="text-xl text-red-600">{i18n[lang].condition}: {heartCondition}</p>}
          {hrv && <p className="text-lg">{i18n[lang].hrvar}: {hrv} ms</p>}
          {stressLevel && <p className="text-lg">{i18n[lang].stress}: {stressLevel}</p>}
          <p className="text-sm text-gray-500 mt-4">{i18n[lang].disclaimer}</p>

          <table className="mt-4 mx-auto table-auto border-collapse text-sm">
            <thead>
              <tr>
                <th className="border px-4 py-2">{i18n[lang].range}</th>
                <th className="border px-4 py-2">{i18n[lang].category}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border px-4 py-2">{"<70 mg/dL"}</td>
                <td className="border px-4 py-2">{i18n[lang].low}</td>
              </tr>
              <tr>
                <td className="border px-4 py-2">{"70 - 99 mg/dL"}</td>
                <td className="border px-4 py-2">{i18n[lang].normal}</td>
              </tr>
              <tr>
                <td className="border px-4 py-2">{"100 - 125 mg/dL"}</td>
                <td className="border px-4 py-2">{i18n[lang].prediabetes}</td>
              </tr>
              <tr>
                <td className="border px-4 py-2">{">=126 mg/dL"}</td>
                <td className="border px-4 py-2">{i18n[lang].diabetes}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {showInstructions && (
        <div className="text-center text-lg text-blue-600" aria-label="Instructions">
          <p>{i18n[lang].instructions}</p>
        </div>
      )}

      <div className="text-center space-x-2">
        {!isReading && !handRemoved && (
          <button
            onClick={startReading}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            aria-label="Start Reading Button"
          >
            {i18n[lang].startReading}
          </button>
        )}

        {isReading && (
          <button
            onClick={stopReading}
            className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            aria-label="Stop Reading Button"
          >
            {i18n[lang].stop}
          </button>
        )}
      </div>

      {/* Advanced Controls */}
      <div className="bg-white p-4 rounded shadow space-y-4" aria-label="Advanced Controls">
        <div>
          <label htmlFor="roi-slider">{i18n[lang].roiLabel}: {roiSize}px</label>
          <input
            id="roi-slider"
            type="range"
            min="20"
            max="100"
            value={roiSize}
            onChange={(e) => setRoiSize(Number(e.target.value))}
          />
        </div>
        <div>
          <label htmlFor="threshold-slider">{i18n[lang].thresholdLabel}: {thresholdFactor.toFixed(2)}</label>
          <input
            id="threshold-slider"
            type="range"
            min="0.1"
            max="1.0"
            step="0.1"
            value={thresholdFactor}
            onChange={(e) => setThresholdFactor(Number(e.target.value))}
          />
        </div>
        <div>
          <label htmlFor="filter-toggle">{i18n[lang].filterLabel}</label>
          <input
            id="filter-toggle"
            type="checkbox"
            checked={applyFilter}
            onChange={(e) => setApplyFilter(e.target.checked)}
          />
        </div>
      </div>

      {/* History */}
      <div className="bg-white p-4 rounded shadow" aria-label="Past Measurements">
        <h2 className="text-xl font-semibold mb-2">{i18n[lang].savedResults}</h2>
        {history.length === 0 ? (
          <p>No past data</p>
        ) : (
          <table className="table-auto w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="border px-2 py-1">Time</th>
                <th className="border px-2 py-1">HR (BPM)</th>
                <th className="border px-2 py-1">Glucose (mg/dL)</th>
                <th className="border px-2 py-1">Condition</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item, i) => (
                <tr key={i}>
                  <td className="border px-2 py-1">{item.time}</td>
                  <td className="border px-2 py-1">{item.heartRate}</td>
                  <td className="border px-2 py-1">{item.glucose}</td>
                  <td className="border px-2 py-1">{item.condition || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default VideoFrameAnalyzer;
