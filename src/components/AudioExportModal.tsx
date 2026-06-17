import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Download, 
  Play, 
  Square, 
  HelpCircle, 
  Loader2, 
  AlertCircle,
  Volume2, 
  Radio, 
  Compass, 
  ListMusic, 
  CheckCircle2, 
  Info,
  Mic,
  AlertTriangle
} from 'lucide-react';
import { SpeechItem, LanguageCode } from '../types';
import * as lamejs from 'lamejs';

interface AudioExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  speechList: SpeechItem[];
  speed: number;
  volume: number;
  timeBetweenLines: number;
  engineMode: 'browser' | 'premium';
  userGeminiApiKey: string;
  voices: SpeechSynthesisVoice[];
  
  // Preferred browser voices from App settings
  selectedEnVoiceName: string;
  selectedViVoiceName: string;
  selectedZhCnVoiceName: string;
  selectedZhTwVoiceName: string;
  selectedJaVoiceName: string;
  selectedKoVoiceName: string;

  // Premium voices
  selectedPremiumVoiceEn: string;
  selectedPremiumVoiceVi: string;
  selectedPremiumVoiceZhCn: string;
  selectedPremiumVoiceZhTw: string;
  selectedPremiumVoiceJa: string;
  selectedPremiumVoiceKo: string;
}

export default function AudioExportModal({
  isOpen,
  onClose,
  speechList,
  speed,
  volume,
  timeBetweenLines,
  engineMode,
  userGeminiApiKey,
  voices,
  selectedEnVoiceName,
  selectedViVoiceName,
  selectedZhCnVoiceName,
  selectedZhTwVoiceName,
  selectedJaVoiceName,
  selectedKoVoiceName,
  selectedPremiumVoiceEn,
  selectedPremiumVoiceVi,
  selectedPremiumVoiceZhCn,
  selectedPremiumVoiceZhTw,
  selectedPremiumVoiceJa,
  selectedPremiumVoiceKo
}: AudioExportModalProps) {
  // Config states
  const [selectedRange, setSelectedRange] = useState<'all' | string>('all');
  const [exportEngine, setExportEngine] = useState<'browser' | 'premium'>(engineMode);
  
  // Custom states matching TheaterPlayer recording setup
  const [includeMic, setIncludeMic] = useState<boolean>(false);
  const [disableEchoCancellation, setDisableEchoCancellation] = useState<boolean>(true);
  const [onlyCurrentTab, setOnlyCurrentTab] = useState<boolean>(false);
  
  // Progress states
  const [status, setStatus] = useState<'idle' | 'processing' | 'recording' | 'success' | 'error'>('idle');
  const [progressText, setProgressText] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  
  // Live capture/volume states
  const [soundLevel, setSoundLevel] = useState<number>(0);
  const [micActiveWarning, setMicActiveWarning] = useState<boolean>(false);
  const [silentTimerCount, setSilentTimerCount] = useState<number>(0);
  
  // Filter speechList based on range
  const [itemsToExport, setItemsToExport] = useState<SpeechItem[]>([]);
  const [availableSets, setAvailableSets] = useState<string[]>([]);
  
  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isStoppedManuallyRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);
  
  // Process sets list
  useEffect(() => {
    if (!speechList || speechList.length === 0) return;
    
    const sets = new Set<string>();
    speechList.forEach(item => {
      if (item.setId) {
        sets.add(item.setId);
      }
    });
    setAvailableSets(Array.from(sets));
  }, [speechList]);

  // Handle calculation of elements to export
  useEffect(() => {
    if (!speechList) return;
    if (selectedRange === 'all') {
      setItemsToExport(speechList);
    } else {
      setItemsToExport(speechList.filter(item => item.setId === selectedRange));
    }
  }, [speechList, selectedRange]);

  // Clean-up on close/unmount
  useEffect(() => {
    return () => {
      cancelAllProcesses();
    };
  }, []);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const cancelAllProcesses = () => {
    isStoppedManuallyRef.current = true;
    
    // Stop recording refs
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    
    // Stop streams
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    
    // Cancel system TTS playbacks
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    // Close AudioContext
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    
    // Clear anim
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  // WAV header generator helper (standard 16-bit PCM mono 24000Hz or 44100Hz)
  const createWavFileBytes = (pcmBuffer: Int16Array, sampleRate: number): Blob => {
    const buffer = new ArrayBuffer(44 + pcmBuffer.byteLength);
    const view = new DataView(buffer);

    // RIFF identifier
    writeString(view, 0, 'RIFF');
    // File length
    view.setUint32(4, 36 + pcmBuffer.byteLength, true);
    // RIFF type
    writeString(view, 8, 'WAVE');
    // Format chunk identifier
    writeString(view, 12, 'fmt ');
    // Format chunk length
    view.setUint32(16, 16, true);
    // Sample format (raw PCM)
    view.setUint16(20, 1, true); // 1 = PCM (Integer)
    // Channel count
    view.setUint16(22, 1, true); // Mono
    // Sample rate
    view.setUint32(24, sampleRate, true);
    // Byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * 2, true);
    // Block align (channel count * bytes per sample)
    view.setUint16(32, 2, true); // 2 bytes per sample (16-bit mono)
    // Bits per sample
    view.setUint16(34, 16, true); // 16-bit
    // Data chunk identifier
    writeString(view, 36, 'data');
    // Data chunk length
    view.setUint32(40, pcmBuffer.byteLength, true);

    // Copy raw audio PCM shorts into WAV bytes body
    const wavArray = new Int16Array(buffer, 44);
    wavArray.set(pcmBuffer);

    return new Blob([buffer], { type: 'audio/wav' });
  };

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // Convert base64 string to a raw PCM Float32 or Int16 array, slicing first 44 bytes wav header
  const extractPcmFromWavDataUrl = (dataUrl: string): Int16Array => {
    const base64 = dataUrl.split(',')[1];
    const binaryStr = window.atob(base64);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    
    // Slice off first 44 bytes to remove the WAV container headers
    const pcmBytes = bytes.slice(44);
    // Cast to Int16Array (since Gemini TTS output is 16-bit PCM)
    return new Int16Array(pcmBytes.buffer, pcmBytes.byteOffset, pcmBytes.length / 2);
  };

  /**
   * FULL-STACK EXPORT GENERATION: PREMIUM AI TTS (Sequence Calls)
   * This retrieves clean audio blocks digitally with 0 background noise
   */
  const handleExportPremiumAI = async () => {
    isStoppedManuallyRef.current = false;
    setStatus('processing');
    setLogs([]);
    setAudioBlobUrl(null);
    setProgressPercent(0);
    
    addLog(`Bắt đầu xử lý số hóa âm thanh Premium với ${itemsToExport.length} câu.`);
    
    if (!userGeminiApiKey || !userGeminiApiKey.trim()) {
      setStatus('error');
      addLog("LỖI: Thiếu Gemini API Key. Hãy kích hoạt ở bảng cấu hình bên trái trước.");
      return;
    }
    
    const sampleRate = 24000; // Gemini TTS standard output is 24kHz Mono 16-bit
    const audioBuffers: Int16Array[] = [];
    
    try {
      for (let i = 0; i < itemsToExport.length; i++) {
        if (isStoppedManuallyRef.current) {
          addLog("Đã hủy bởi người dùng.");
          setStatus('idle');
          return;
        }
        
        const item = itemsToExport[i];
        const stepPercent = Math.round((i / itemsToExport.length) * 80);
        setProgressPercent(stepPercent);
        setProgressText(`Đang kết nối AI để lấy giọng đọc câu ${i + 1}/${itemsToExport.length}...`);
        
        const itemLang = item.selectedLang === 'auto' ? item.detectedLang : item.selectedLang;
        let chosenVoice = selectedPremiumVoiceEn;
        if (itemLang === 'vi') chosenVoice = selectedPremiumVoiceVi;
        else if (itemLang === 'zh-cn') chosenVoice = selectedPremiumVoiceZhCn;
        else if (itemLang === 'zh-tw') chosenVoice = selectedPremiumVoiceZhTw;
        else if (itemLang === 'ja') chosenVoice = selectedPremiumVoiceJa;
        else if (itemLang === 'ko') chosenVoice = selectedPremiumVoiceKo;
        
        addLog(`Gọi API câu ${i + 1}/${itemsToExport.length} [${itemLang}]: "${item.text.substring(0, 30)}..."`);
        
        // 1. Fetch from Gemini endpoint
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: item.text,
            voice: chosenVoice,
            lang: itemLang,
            userApiKey: userGeminiApiKey
          })
        });
        
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || `Lỗi máy chủ trả về mã ${response.status}`);
        }
        
        const resData = await response.json();
        const rawPcm = extractPcmFromWavDataUrl(resData.audioUrl);
        
        // Push the item's audio segments, repeating based on configured item repeats!
        const lineRepeats = item.repeats || 1;
        const lineDelay = item.delaySec !== undefined ? item.delaySec : timeBetweenLines;
        
        for (let rep = 0; rep < lineRepeats; rep++) {
          audioBuffers.push(rawPcm);
          // Insert silent buffers between repetitions
          if (rep < lineRepeats - 1 && lineDelay > 0) {
            const silenceSamplesCount = Math.round(sampleRate * lineDelay);
            audioBuffers.push(new Int16Array(silenceSamplesCount)); // Array filled with zeroes
          }
        }
        
        // Insert silence after line before auto advancing to next
        if (i < itemsToExport.length - 1 && lineDelay > 0) {
          const advanceSilenceSamplesCount = Math.round(sampleRate * lineDelay);
          audioBuffers.push(new Int16Array(advanceSilenceSamplesCount));
        }
      }
      
      // Calculate total compiled buffer length
      setProgressPercent(90);
      setProgressText("Đang liên kết các mảnh âm thanh & chèn khoảng lặng giữa các câu...");
      
      let totalLength = 0;
      audioBuffers.forEach(buf => totalLength += buf.length);
      
      const compiledPcm = new Int16Array(totalLength);
      let offset = 0;
      audioBuffers.forEach(buf => {
        compiledPcm.set(buf, offset);
        offset += buf.length;
      });
      
      // Save compiled WAV container
      addLog("Gói định dạng WAV container chất lượng cao...");
      const finalWavBlob = createWavFileBytes(compiledPcm, sampleRate);
      const url = URL.createObjectURL(finalWavBlob);
      
      setAudioBlobUrl(url);
      setProgressPercent(100);
      setStatus('success');
      addLog("Chúc mừng! File âm thanh đã được liên kết thành công kỹ thuật số 100%.");
      
    } catch (err: any) {
      console.error("Lỗi xuất Premium AI:", err);
      setStatus('error');
      addLog(`Lỗi: ${err.message || "Không thể tải giọng đọc AI."}`);
    }
  };

  /**
   * WEB-ONLY EXPORT FLOW: BROWSER SPEECH SYNTHESIS RECORDING
   * Records native window speechSynthesis played on the local tab
   */
  const handleExportBrowserTTS = async () => {
    isStoppedManuallyRef.current = false;
    setStatus('recording');
    setLogs([]);
    setAudioBlobUrl(null);
    setProgressPercent(0);
    setSoundLevel(0);
    setSilentTimerCount(0);
    setMicActiveWarning(false);
    chunksRef.current = [];
    
    addLog("Chuẩn bị cơ chế ghi âm SpeechSynthesis của trình duyệt...");
    addLog("HƯỚNG DẪN BẮT BUỘC: Bạn hãy chọn tab 'Toàn bộ màn hình' (Entire Screen), tích vào ô 'Chia sẻ âm thanh hệ thống' (Share system audio) ở góc trái dưới, rồi chọn Màn hình của bạn.");

    try {
      let micStream: MediaStream | null = null;
      if (includeMic) {
        try {
          try {
            micStream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: !disableEchoCancellation,
                noiseSuppression: !disableEchoCancellation,
                autoGainControl: true
              }
            });
          } catch (firstTryErr) {
            console.warn("Direct customizable mic stream constraints failed, falling back to basic audio stream:", firstTryErr);
            micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          }
          micStreamRef.current = micStream;
          addLog("Đã khởi tạo Microphone thành công!");
        } catch (micErr: any) {
          console.warn("Microphone access is denied, falling back:", micErr);
          addLog("Không chọn được Microphone ngoài (chưa cắm hoặc chưa cấp quyền).");
        }
      }

      // 1. Capture display stream with optimized entire screen / system audio cues
      const displayConstraints: any = {
        video: {
          displaySurface: "monitor",
          width: 320,
          height: 180,
          frameRate: 10
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          systemAudio: "include"
        },
        selfBrowserSurface: "exclude",
        monitorTypeSurfaces: "include"
      };

      if (onlyCurrentTab) {
        displayConstraints.preferCurrentTab = true;
        displayConstraints.selfBrowserSurface = "include";
        delete displayConstraints.video.displaySurface;
        delete displayConstraints.monitorTypeSurfaces;
      }

      const stream = await (navigator.mediaDevices as any).getDisplayMedia(displayConstraints);
      mediaStreamRef.current = stream;
      
      // 2. Validate audio track selection
      const displayAudioTracks = stream.getAudioTracks();
      const micAudioTracks = includeMic && micStream ? micStream.getAudioTracks() : [];
      const hasDisplayAudio = displayAudioTracks.length > 0;
      const hasMicAudio = micAudioTracks.length > 0;

      if (displayAudioTracks.length === 0 && micAudioTracks.length === 0) {
        stream.getTracks().forEach(t => t.stop());
        if (micStream) micStream.getTracks().forEach(t => t.stop());
        throw new Error("Không bắt được bất kỳ luồng âm thanh hệ thống hoặc loa nào. Vui lòng bấm làm lại, tích vào 'Chia sẻ âm thanh hệ thống' ở góc trái dưới!");
      }
      
      addLog("Khởi tạo bộ thu âm...");
      
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      audioContextRef.current = audioCtx;

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      
      const dest = audioCtx.createMediaStreamDestination();

      // ==========================================
      // STAGE 2: MANDATORY PREFLIGHT CHECK (KIỂM TRA TÍN HIỆU CỨNG)
      // ==========================================
      if (hasDisplayAudio) {
        addLog("Đang chạy Preflight check: kiểm tra tín hiệu SpeechSynthesis...");
        setProgressText("Preflight check: Đang kiểm tra tín hiệu âm thanh...");
        
        // Setup temporary preflight connections
        const preflightSource = audioCtx.createMediaStreamSource(stream);
        const preflightAnalyser = audioCtx.createAnalyser();
        preflightAnalyser.fftSize = 256;
        preflightSource.connect(preflightAnalyser);
        preflightSource.connect(audioCtx.destination); // Route to physical speakers for audible feedback during preflight
        
        const preflightData = new Uint8Array(preflightAnalyser.frequencyBinCount);
        
        // Trigger short test utterance
        const testUtterance = new SpeechSynthesisUtterance("Starting");
        testUtterance.volume = 1.0;
        testUtterance.rate = 1.0;
        testUtterance.lang = "en-US";
        
        // Force cancellation and play
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(testUtterance);
        
        let detectedSignal = false;
        let peakLevel = 0;
        const startTime = Date.now();
        
        const checkPreflight = () => {
          return new Promise<boolean>((resolve) => {
            const checkTimer = setInterval(() => {
              preflightAnalyser.getByteFrequencyData(preflightData);
              let sum = 0;
              for (let i = 0; i < preflightData.length; i++) {
                sum += preflightData[i];
              }
              const avg = sum / preflightData.length;
              if (avg > peakLevel) peakLevel = avg;
              if (avg > 2.0) {
                detectedSignal = true;
              }
              
              if (Date.now() - startTime >= 2500) {
                clearInterval(checkTimer);
                resolve(detectedSignal);
              }
            }, 100);
          });
        };
        
        const preflightResult = await checkPreflight();
        window.speechSynthesis.cancel(); // Stop preflight speech
        
        // Clean up preflight connections
        preflightSource.disconnect();
        
        if (!preflightResult) {
          stream.getTracks().forEach(t => t.stop());
          if (micStream) micStream.getTracks().forEach(t => t.stop());
          throw new Error(`PREFLIGHT_FAIL: Âm thanh hoàn toàn câm (Độ lớn cực đại: ${peakLevel.toFixed(1)}). Bạn PHẢI chọn mục 'Toàn bộ màn hình' và bật 'Chia sẻ âm thanh hệ thống' để thu được giọng nói.`);
        }
        
        addLog(`Preflight OK! Nhận được tín hiệu âm thanh hệ thống (Cường độ cực đại: ${peakLevel.toFixed(1)}).`);
      }
      
      // Setup permanent live routing
      let displaySourceNode: MediaStreamAudioSourceNode | null = null;
      let analyserNode: AnalyserNode | null = null;
      let analyserDataArray: Uint8Array | null = null;

      if (hasDisplayAudio) {
        displaySourceNode = audioCtx.createMediaStreamSource(stream);
        displaySourceNode.connect(dest);
        displaySourceNode.connect(audioCtx.destination); // Route system audio directly to user speakers
        
        analyserNode = audioCtx.createAnalyser();
        analyserNode.fftSize = 256;
        displaySourceNode.connect(analyserNode);
        analyserDataArray = new Uint8Array(analyserNode.frequencyBinCount);
      }

      if (hasMicAudio && micStream) {
        const micSource = audioCtx.createMediaStreamSource(micStream);
        micSource.connect(dest);
      }
      
      // Setup active silence checker loop
      let lastCheckTime = Date.now();
      let activeSilenceDuration = 0;
      let warningSilenceCounter = 0;

      const updateVolumePeak = () => {
        if (isStoppedManuallyRef.current || !analyserNode || !analyserDataArray) return;
        
        analyserNode.getByteFrequencyData(analyserDataArray);
        let sum = 0;
        for (let i = 0; i < analyserDataArray.length; i++) {
          sum += analyserDataArray[i];
        }
        const avg = sum / analyserDataArray.length;
        setSoundLevel(avg);
        
        const now = Date.now();
        const delta = (now - lastCheckTime) / 1000;
        lastCheckTime = now;
        
        // Silent gate: if browser currently speaking, but no audio gets captured for 3 seconds, throw error!
        const isCurrentlySpeaking = window.speechSynthesis.speaking;
        if (isCurrentlySpeaking) {
          if (avg < 1.0) {
            activeSilenceDuration += delta;
            if (activeSilenceDuration >= 3.0) {
              addLog("CẢNH BÁO: Tín hiệu âm thanh biến mất khi đang đọc bài!");
              cancelAllProcesses();
              setStatus('error');
              setProgressText("Không thu được tiếng");
              addLog("LỖI: Trình duyệt bị im lặng hơn 3 giây liên tiếp trong quá trình đọc. Bản ghi bị hủy.");
              return;
            }
          } else {
            activeSilenceDuration = 0;
          }
        } else {
          activeSilenceDuration = 0;
        }

        if (avg < 2) {
          warningSilenceCounter++;
          if (warningSilenceCounter > 180) {
            setMicActiveWarning(true);
          }
        } else {
          warningSilenceCounter = 0;
          setMicActiveWarning(false);
        }
        
        animationFrameRef.current = requestAnimationFrame(updateVolumePeak);
      };

      if (hasDisplayAudio) {
        lastCheckTime = Date.now();
        updateVolumePeak();
      } else {
        setSoundLevel(5); // fallback level
      }

      // 3. Initialize MediaRecorder to capture webm/opus buffer sequentially
      const recorderStream = new MediaStream();
      const mixedTracks = dest.stream.getAudioTracks();
      if (mixedTracks.length > 0) {
        recorderStream.addTrack(mixedTracks[0]);
      } else {
        if (hasDisplayAudio) {
          recorderStream.addTrack(displayAudioTracks[0]);
        } else if (hasMicAudio) {
          recorderStream.addTrack(micAudioTracks[0]);
        }
      }
      
      let options = { mimeType: 'audio/webm;codecs=opus' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'audio/ogg;codecs=opus' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: '' }; // Fallback to browser default
        }
      }
      
      addLog(`Kích hoạt máy ghi âm phụ trợ (codec: ${options.mimeType || "mặc định"})`);
      const recorder = new MediaRecorder(recorderStream, options);
      mediaRecorderRef.current = recorder;
      
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };
      
      recorder.onstop = async () => {
        addLog("Đọc hoàn tất. Tiến hành nén tệp tin mpeg-MP3 thật...");
        setProgressText("Đang giải nén & nén sang định dạng MP3 thật...");
        setStatus('processing');
        
        if (chunksRef.current.length === 0) {
          setStatus('error');
          addLog("LỖI: Bản ghi rỗng.");
          return;
        }
        
        try {
          const webmBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const arrayBuffer = await webmBlob.arrayBuffer();
          
          // Decode raw audio webm/opus into float32 samples
          const decodeCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          let decodedBuffer: AudioBuffer;
          try {
            decodedBuffer = await decodeCtx.decodeAudioData(arrayBuffer);
          } catch (decErr) {
            console.error("Failed to decode audio data", decErr);
            addLog("Không thể giải mã PCM từ bộ nhớ tạm. Lưu trữ trực tiếp dưới dạng WebM làm phương án dự phòng.");
            const webmUrl = URL.createObjectURL(webmBlob);
            setAudioBlobUrl(webmUrl);
            setStatus('success');
            return;
          } finally {
            decodeCtx.close().catch(() => {});
          }
          
          addLog(`Bắt đầu chuyển đổi mã hóa sang MP3 128kbps (Tần số: ${decodedBuffer.sampleRate}Hz)...`);
          
          const EncoderClass = (lamejs as any).Mp3Encoder || (lamejs as any).default?.Mp3Encoder;
          if (!EncoderClass) {
            throw new Error("Không thể tìm thấy lớp mã hóa lamejs.");
          }
          
          const channels = 1; // Mono for voice data
          const sampleRate = decodedBuffer.sampleRate;
          const kbps = 128;
          const mp3encoder = new EncoderClass(channels, sampleRate, kbps);
          
          const numSamples = decodedBuffer.length;
          const leftChan = decodedBuffer.getChannelData(0);
          const rightChan = decodedBuffer.numberOfChannels > 1 ? decodedBuffer.getChannelData(1) : null;
          
          // Mixed to Mono Float32
          const monoFloat = new Float32Array(numSamples);
          if (rightChan) {
            for (let i = 0; i < numSamples; i++) {
              monoFloat[i] = (leftChan[i] + rightChan[i]) / 2;
            }
          } else {
            monoFloat.set(leftChan);
          }
          
          // Float32 to Int16
          const pcmInt16 = new Int16Array(numSamples);
          for (let i = 0; i < numSamples; i++) {
            let s = monoFloat[i];
            s = Math.max(-1.0, Math.min(1.0, s));
            pcmInt16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          
          // Encode in chunks
          const mp3Chunks: Uint8Array[] = [];
          const bufferChunkSize = 1152;
          for (let offset = 0; offset < numSamples; offset += bufferChunkSize) {
            const block = pcmInt16.subarray(offset, Math.min(offset + bufferChunkSize, numSamples));
            const mp3buf = mp3encoder.encodeBuffer(block);
            if (mp3buf.length > 0) {
              mp3Chunks.push(mp3buf);
            }
          }
          
          const endBuf = mp3encoder.flush();
          if (endBuf.length > 0) {
            mp3Chunks.push(endBuf);
          }
          
          const finalMp3Blob = new Blob(mp3Chunks, { type: 'audio/mpeg' });
          const mp3Url = URL.createObjectURL(finalMp3Blob);
          
          setAudioBlobUrl(mp3Url);
          setStatus('success');
          addLog("Chúc mừng! Đã xuất file MP3 thật (audio/mpeg) thành công.");
          
        } catch (mp3Err: any) {
          console.error("MP3 encoder failed:", mp3Err);
          addLog(`Lỗi mã hóa MP3: ${mp3Err.message || mp3Err}`);
          setStatus('error');
        }
      };
      
      // Start recording
      recorder.start();
      
      // 4. Sequential browser SpeechSynthesis loop
      let currentIndex = 0;
      
      const playNextItem = () => {
        if (isStoppedManuallyRef.current) {
          recorder.stop();
          return;
        }
        
        if (currentIndex >= itemsToExport.length) {
          addLog("Đã chạy hết danh sách câu. Đang dừng ghi âm...");
          recorder.stop();
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(t => t.stop());
            mediaStreamRef.current = null;
          }
          if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(t => t.stop());
            micStreamRef.current = null;
          }
          return;
        }
        
        const item = itemsToExport[currentIndex];
        const percent = Math.round((currentIndex / itemsToExport.length) * 100);
        setProgressPercent(percent);
        setProgressText(`Đang phát dòng ${currentIndex + 1}/${itemsToExport.length}: "${item.text.substring(0, 40)}"`);
        
        let currentRepeat = 1;
        const maxRepeats = item.repeats || 1;
        const lineDelay = item.delaySec !== undefined ? item.delaySec : timeBetweenLines;
        
        const speakIteration = () => {
          if (isStoppedManuallyRef.current) return;
          
          const utterance = new SpeechSynthesisUtterance(item.text);
          recordingUtteranceRef.current = utterance;
          
          // Configure parameters
          utterance.rate = item.speed !== undefined ? item.speed : speed;
          utterance.volume = Math.min(1.0, volume);
          
          const langCode = item.selectedLang === 'auto' ? item.detectedLang : item.selectedLang;
          let targetLang = 'en-US';
          if (langCode === 'vi') targetLang = 'vi-VN';
          else if (langCode === 'zh-cn') targetLang = 'zh-CN';
          else if (langCode === 'zh-tw') targetLang = 'zh-TW';
          else if (langCode === 'ja') targetLang = 'ja-JP';
          else if (langCode === 'ko') targetLang = 'ko-KR';
          utterance.lang = targetLang;
          
          // Attach browser voices matching settings
          let preferredVoiceName = '';
          if (langCode === 'en') preferredVoiceName = selectedEnVoiceName;
          else if (langCode === 'vi') preferredVoiceName = selectedViVoiceName;
          else if (langCode === 'zh-cn') preferredVoiceName = selectedZhCnVoiceName;
          else if (langCode === 'zh-tw') preferredVoiceName = selectedZhTwVoiceName;
          else if (langCode === 'ja') preferredVoiceName = selectedJaVoiceName;
          else if (langCode === 'ko') preferredVoiceName = selectedKoVoiceName;
          
          if (preferredVoiceName) {
            const preferredVoice = voices.find(v => v.name === preferredVoiceName);
            if (preferredVoice) utterance.voice = preferredVoice;
          } else {
            const targetPrefix = langCode === 'vi' ? 'vi' : (langCode.startsWith('zh') ? 'zh' : (langCode === 'ja' ? 'ja' : (langCode === 'ko' ? 'ko' : 'en')));
            const bestVoice = voices.find(v => v.lang.toLowerCase().replace('_', '-').startsWith(targetPrefix));
            if (bestVoice) utterance.voice = bestVoice;
          }
          
          utterance.onend = () => {
            if (isStoppedManuallyRef.current) return;
            
            if (currentRepeat < maxRepeats) {
              currentRepeat++;
              addLog(`Đọc lại câu ${currentIndex + 1} (lần ${currentRepeat}/${maxRepeats})`);
              setTimeout(speakIteration, lineDelay * 1000);
            } else {
              // Finish this sentence. Move to next!
              currentIndex++;
              setTimeout(playNextItem, lineDelay * 1050);
            }
          };
          
          utterance.onerror = (e) => {
            addLog(`Hệ thống TTS cảnh báo trên dòng ${currentIndex + 1}: ${e.error}`);
            currentIndex++;
            setTimeout(playNextItem, 1000);
          };
          
          window.speechSynthesis.speak(utterance);
        };
        
        speakIteration();
      };
      
      // Start loop
      playNextItem();
      
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      addLog(`Lỗi chuẩn bị ghi âm: ${err.message || err}`);
    }
  };

  const handleStartExport = () => {
    if (exportEngine === 'premium') {
      handleExportPremiumAI();
    } else {
      handleExportBrowserTTS();
    }
  };

  const handleDownload = () => {
    if (!audioBlobUrl) return;
    
    const link = document.createElement('a');
    link.href = audioBlobUrl;
    
    const dateStr = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
    const rangeText = selectedRange === 'all' ? 'FULL' : `Set-${selectedRange}`;
    const fileExt = exportEngine === 'premium' ? 'wav' : 'mp3'; // browser exports opus-webm, we name to mp3 for easier player triggers
    
    link.download = `am-thanh-luyen-nghe-${rangeText}-${dateStr}.${fileExt}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div id="audio-export-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs select-none animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Bộ Xuất Âm Thanh Độc Lập</h3>
              <p className="text-[11px] text-slate-500 font-medium">Xuất danh sách bài tập thành các file âm thanh MP3/WAV ngoại tuyến</p>
            </div>
          </div>
          <button 
            onClick={() => {
              cancelAllProcesses();
              onClose();
            }}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {status === 'idle' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 space-y-3.5">
                {/* 1. Range Scope Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <ListMusic className="w-4 h-4 text-indigo-500" />
                    Phạm vi xuất âm thanh:
                  </label>
                  <select 
                    value={selectedRange}
                    onChange={(e) => setSelectedRange(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg text-xs py-2 px-3 font-medium outline-hidden focus:border-indigo-500 cursor-pointer text-slate-700"
                  >
                    <option value="all">Toàn bộ danh sách ({speechList.length} câu)</option>
                    {availableSets.map((setId) => {
                      const count = speechList.filter(item => item.setId === setId).length;
                      return (
                        <option key={setId} value={setId}>
                          Chỉ Set: {setId} (Gồm {count} câu)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 2. Audio Engine Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-indigo-500" />
                    Chế độ Động cơ Giọng đọc:
                  </label>
                  <div className="grid grid-cols-2 gap-3.5">
                    {/* Browser Engine Selection */}
                    <div 
                      onClick={() => setExportEngine('browser')}
                      className={`p-3 rounded-xl border transition cursor-pointer select-none relative ${
                        exportEngine === 'browser' 
                          ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900 shadow-sm' 
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div className="font-extrabold text-xs">Giọng Browser TTS</div>
                      <div className="text-[10px] text-slate-400 mt-1">Ghi âm thực bản địa tự động, không tốn tài nguyên.</div>
                      {exportEngine === 'browser' && (
                        <div className="absolute right-2 top-2 w-2 h-2 rounded-full bg-indigo-600" />
                      )}
                    </div>

                    {/* Premium AI Engine Selection */}
                    <div 
                      onClick={() => setExportEngine('premium')}
                      className={`p-3 rounded-xl border transition cursor-pointer select-none relative ${
                        exportEngine === 'premium' 
                          ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900 shadow-sm' 
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div className="font-extrabold text-xs">Premium AI (Gemini)</div>
                      <div className="text-[10px] text-slate-400 mt-1">Xuất siêu tốc, kỹ thuật số 100% tinh khiết, cực hay.</div>
                      {exportEngine === 'premium' && (
                        <div className="absolute right-2 top-2 w-2 h-2 rounded-full bg-indigo-600" />
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Browser Recording Config Toggle Panel */}
                {exportEngine === 'browser' && (
                  <div className="mt-2.5 bg-slate-100/60 border border-slate-200 rounded-xl p-3.5 space-y-2.5 text-xs animate-fade-in">
                    <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Mic className="w-4 h-4 text-indigo-650" />
                      Cấu hình thu âm (Cơ chế giống hệt quay Video):
                    </span>
                    
                    <div className="space-y-2 font-medium">
                      <label className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={includeMic}
                          onChange={(e) => setIncludeMic(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span>Thu cả Microphone ngoài / Loa ngoài <span className="text-[#a15c00] font-extrabold bg-[#fff7ed] px-1 py-0.5 rounded text-[10px] border border-[#ffedd5]">(KHẮC PHỤC ASUS LẶNG TIẾNG)</span></span>
                      </label>

                      <label className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={disableEchoCancellation}
                          onChange={(e) => setDisableEchoCancellation(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span>Tắt Khử tiếng Vang (Bảo toàn âm thanh gốc TTS phát ra)</span>
                      </label>

                      <label className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={onlyCurrentTab}
                          onChange={(e) => setOnlyCurrentTab(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span>Chỉ hiển thị chia sẻ Thẻ trình duyệt hiện tại</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions and help banners */}
              {exportEngine === 'browser' ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <div className="flex gap-2.5">
                    <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-amber-800 leading-relaxed font-semibold">
                      <strong className="text-amber-900 block mb-1 text-xs">⚠️ GIỚI HẠN BẢO MẬT & ROUTING ÂM THANH TRÊN CHROME:</strong>
                      Mặc dù bạn đã bấm chọn "Chia sẻ âm thanh thẻ" (Share tab audio), Google Chrome gộc tiếng nói mặc định <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold text-amber-950 text-[10px]">speechSynthesis</code> thẳng ra loa vật lý và <strong className="text-rose-700">bỏ qua dòng âm thanh thu âm nội bộ của Thẻ (Tab)</strong>. Do đó khi chỉ chia sẻ "Thẻ", video/audio sẽ luôn bị IM LẶNG.
                    </div>
                  </div>
                  
                  <div className="bg-white border border-amber-150 p-3 rounded-lg text-[11px] text-slate-700 space-y-2.5 shadow-3xs">
                    <div>
                      <span className="font-extrabold text-emerald-700 block">🌿 Giải pháp 1 (Khuyên dùng - Thành công 100%): Chọn "Premium AI (Gemini)"</span>
                      <p className="text-slate-600 mt-0.5 leading-snug">
                        Chuyển động cơ phía trên sang <strong>"Premium AI (Gemini)"</strong>. Ở chế độ này, âm thanh được số hóa trực tiếp từ máy chủ Google, <strong>tải xuống ngay lập tức trong 3 giây</strong> tinh khiết 100% không lẫn tạp âm, không cần ngồi đợi chạy từng câu phát ra loa ngoài.
                        <span className="text-indigo-600 block mt-1 font-semibold">💡 Cách làm: Chỉ cần nhập mã Gemini API Key ở cột "Cấu hình" màu xám bên trái màn hình chính.</span>
                      </p>
                    </div>
                    
                    <hr className="border-slate-100" />
                    
                    <div>
                      <span className="font-extrabold text-amber-950 block">🖥️ Giải pháp 2 (Để xuất bằng Giọng Trình Duyệt): Chia sẻ Toàn Màn Hình hoặc dùng Microphone</span>
                      <p className="text-slate-600 mt-0.5 leading-snug">
                        Nếu vẫn muốn dùng giọng đọc máy tính tự do, nhờ tuỳ chọn <strong>"Thu cả Mic/Loa ngoài"</strong> đã kích hoạt phía trên (Cơ chế giống quay Video):
                      </p>
                      <ol className="list-decimal pl-4.5 mt-1 space-y-1 text-slate-600 text-[10.5px]">
                        <li>Khi hộp thoại chia sẻ hiện lên, hãy nhớ tích chọn mục <strong className="text-slate-900">"Đồng thời chia sẻ âm thanh thẻ" (Also share tab audio)</strong> ở góc dưới (nếu chọn chia sẻ Thẻ/Tab).</li>
                        <li>Hoặc chọn <strong className="text-slate-900 font-extrabold">"Toàn bộ màn hình" (Entire Screen)</strong> và tích chọn <strong className="text-slate-900 font-extrabold">"Chia sẻ âm thanh hệ thống"</strong> ở góc dưới cùng bên trái.</li>
                        <li>Do mic laptop sẽ thu lại tiếng phát ra từ loa Asus, bạn hãy <strong>bật loa laptop Asus lớn lên một chút</strong> để Microphone ghi nhận rõ nét nhé!</li>
                      </ol>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3.5 flex gap-2.5 animate-fade-in">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-indigo-850 leading-relaxed font-medium">
                    <strong className="text-indigo-900 font-extrabold">Xuất Bản Âm Thanh Kỹ Thuật Số (Premium AI):</strong> Hệ thống tải các phân đoạn âm thanh chất lượng cao trực tiếp và ghép nối tự động. Tốc độ xuất nhanh đột phá, chuẩn xác 100%, không phụ thuộc vào loa hay mic máy tính của bạn.
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <button
                type="button"
                onClick={handleStartExport}
                className="w-full bg-indigo-600 text-white rounded-xl py-2.5 font-bold hover:bg-indigo-700 transition active:scale-98 text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Bắt đầu Xuất Âm Thanh ({itemsToExport.length} câu)</span>
              </button>
            </div>
          )}

          {/* Processing / Recording Live Status */}
          {(status === 'processing' || status === 'recording') && (
            <div className="space-y-5 py-2">
              <div className="text-center space-y-2">
                <Loader2 className="w-9 h-9 text-indigo-600 animate-spin mx-auto" />
                <h4 className="font-bold text-sm text-slate-800">
                  {status === 'recording' ? 'Đang Thu Âm Trực Tiếp...' : 'Đang Tổng Hợp Âm Thanh...'}
                </h4>
                <p className="text-xs text-slate-500 font-medium">{progressText}</p>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-slate-400">
                  <span>TIẾN ĐỘ TỔNG HỢP</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Live sound level level check for Browser Synthesis */}
              {status === 'recording' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Mic className={`w-3.5 h-3.5 ${soundLevel > 2 ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
                      Tín hiệu thu âm từ thẻ:
                    </span>
                    <span className="text-xs font-bold text-slate-650">{soundLevel > 2 ? "🟢 Đang phát & thu âm..." : "🟡 Đang chờ phát (hoặc im lặng)..."}</span>
                  </div>
                  
                  {/* Visualizer bar */}
                  <div className="w-full bg-slate-250 rounded-full h-4 overflow-hidden flex gap-[2px] p-[2px]">
                    <div 
                      className="bg-emerald-500 h-full rounded-r-xs transition-all duration-75"
                      style={{ width: `${Math.min(100, Math.max(5, soundLevel * 2.5))}%` }}
                    />
                  </div>

                  {/* Warning if silent */}
                  {micActiveWarning && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 leading-relaxed space-y-2.5 animate-pulse">
                      <div className="flex gap-2 items-start font-extrabold text-rose-900 text-xs">
                        <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-rose-600 animate-bounce" />
                        <span>⚠️ CHƯA NHẬN ĐƯỢC TÍN HIỆU ÂM THANH!</span>
                      </div>
                      <p className="text-[10.5px]">
                        Google Chrome <strong>không đẩy tiếng nói speechSynthesis</strong> vào luồng thu âm của một Thẻ riêng biệt (Tab). Vui lòng khắc phục ngay bằng cách sau:
                      </p>
                      
                      <div className="bg-white border border-rose-200 p-3 rounded-lg space-y-2 text-slate-800 font-medium">
                        <p className="font-extrabold text-rose-950 text-[11px]">Cách sửa để thu thành công:</p>
                        <ul className="list-disc pl-4 space-y-1 text-[10px] text-slate-650 leading-relaxed">
                          <li>Bấm nút <strong className="text-slate-900">Hủy bỏ quy trình</strong> bên dưới.</li>
                          <li>Bấm <strong>Xuất File</strong> lại, khi hộp thoại Chrome hiện lên, chọn mục <strong className="text-rose-900 font-extrabold text-[10.5px]">"Toàn bộ màn hình" (Entire Screen)</strong> (tab đầu tiên) và <strong>TÍCH CHỌN "Chia sẻ âm thanh hệ thống"</strong> ở góc dưới.</li>
                          <li>Hoặc chuyển sang chuyển đổi bằng <strong className="text-emerald-700">"Premium AI (Gemini)"</strong> phía trên để tải file tải về luôn trong 3 giây không phụ thuộc Chrome loa ngoài.</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Miniature Logs Panel */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase block">Nhật ký xử lý:</span>
                <div className="bg-slate-900 rounded-xl p-3.5 h-32 overflow-y-auto font-mono text-[10px] text-indigo-200 space-y-1 select-text scrollbar-thin">
                  {logs.slice().reverse().map((log, idx) => (
                    <div key={idx} className="leading-relaxed opacity-90">{log}</div>
                  ))}
                </div>
              </div>

              {/* Cancel Button */}
              <button
                type="button"
                onClick={() => {
                  cancelAllProcesses();
                  setStatus('idle');
                }}
                className="w-full bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl py-2 font-bold text-xs transition active:scale-98 cursor-pointer"
              >
                Hủy bỏ quy trình
              </button>
            </div>
          )}

          {/* Success screen once audio compile finishes */}
          {status === 'success' && (
            <div className="space-y-4 text-center py-6">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100 shadow-sm">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              
              <div className="space-y-1.5">
                <h4 className="font-extrabold text-slate-800 text-base">Hoàn Tất Chuyển Đổi!</h4>
                <p className="text-xs text-slate-500 font-medium">
                  File âm thanh của bạn đã sẵn sàng lưu trữ ngoại tuyến.
                </p>
              </div>

              {/* Audio mini block player */}
              {audioBlobUrl && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/50 max-w-sm mx-auto">
                  <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase mb-2">Nghe thử bản ghi</p>
                  <audio src={audioBlobUrl} controls className="w-full h-8 outline-hidden rounded-lg" />
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 max-w-sm mx-auto pt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setStatus('idle')}
                  className="flex-1 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold py-2 rounded-xl text-xs transition active:scale-98 cursor-pointer"
                >
                  Xuất thêm set khác
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải Về Máy</span>
                </button>
              </div>
            </div>
          )}

          {/* Error screen */}
          {status === 'error' && (
            <div className="space-y-4 py-4 text-center">
              <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-100">
                <AlertCircle className="w-8 h-8" />
              </div>
              
              <div className="space-y-1.5 max-w-md mx-auto">
                <h4 className="font-extrabold text-rose-800 text-sm">Chuyển Đổi Thất Bại</h4>
                <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3.5 text-left font-mono text-[10px] text-rose-800 max-h-32 overflow-y-auto">
                  {logs.slice().reverse().map((log, idx) => (
                    <div key={idx}>{log}</div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStatus('idle')}
                className="mt-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-5 py-2 rounded-xl text-xs transition cursor-pointer"
              >
                Trở lại cài đặt
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
