import { Radio, X } from 'lucide-react';
import type { SpeechItem } from '../../types';
import { AudioExportResult } from './AudioExportResult';
import { AudioExportProgress } from './AudioExportProgress';
import { AudioExportSettings } from './AudioExportSettings';

type ExportStatus = 'idle' | 'processing' | 'recording' | 'success' | 'error';
type ExportEngine = 'browser' | 'premium';
type AudioSource = 'system' | 'mic';

interface AudioExportViewProps {
  status: ExportStatus;
  selectedRange: 'all' | string;
  availableSets: string[];
  speechList: SpeechItem[];
  exportEngine: ExportEngine;
  audioSource: AudioSource;
  onlyCurrentTab: boolean;
  itemCount: number;
  progressText: string;
  progressPercent: number;
  soundLevel: number;
  micActiveWarning: boolean;
  logs: string[];
  audioBlobUrl: string | null;
  onClose: () => void;
  onCancel: () => void;
  onReset: () => void;
  onDownload: () => void;
  onStart: () => void;
  onSelectedRangeChange: (value: 'all' | string) => void;
  onExportEngineChange: (value: ExportEngine) => void;
  onAudioSourceChange: (value: AudioSource) => void;
  onOnlyCurrentTabChange: (value: boolean) => void;
}

export function AudioExportView(props: AudioExportViewProps) {
  return <div id="audio-export-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs select-none animate-fade-in">
    <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden relative flex flex-col max-h-[90vh]">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2"><div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Radio className="w-5 h-5 animate-pulse" /></div><div><h3 className="font-extrabold text-slate-900 text-base">Xuất Âm Thanh Hàng Loạt</h3><p className="text-[11px] text-slate-500 font-medium">Xuất danh sách bài tập thành file MP3/WAV ngoài tuyến</p></div></div>
        <button onClick={props.onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer transition"><X className="w-5 h-5" /></button>
      </div>
      <div className="p-6 overflow-y-auto space-y-5 flex-1">
        {props.status === 'idle' && <AudioExportSettings selectedRange={props.selectedRange} onSelectedRangeChange={props.onSelectedRangeChange} availableSets={props.availableSets} speechList={props.speechList} exportEngine={props.exportEngine} onExportEngineChange={props.onExportEngineChange} audioSource={props.audioSource} onAudioSourceChange={props.onAudioSourceChange} onlyCurrentTab={props.onlyCurrentTab} onOnlyCurrentTabChange={props.onOnlyCurrentTabChange} itemCount={props.itemCount} onStart={props.onStart} />}
        {(props.status === 'processing' || props.status === 'recording') && <AudioExportProgress status={props.status} progressText={props.progressText} progressPercent={props.progressPercent} soundLevel={props.soundLevel} micActiveWarning={props.micActiveWarning} logs={props.logs} onCancel={props.onCancel} />}
        {(props.status === 'success' || props.status === 'error') && <AudioExportResult status={props.status} audioBlobUrl={props.audioBlobUrl} logs={props.logs} onReset={props.onReset} onDownload={props.onDownload} />}
      </div>
    </div>
  </div>;
}
