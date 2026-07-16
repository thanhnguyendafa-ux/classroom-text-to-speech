import type { ComponentProps, ReactNode } from 'react';
import { LessonInputPanel } from '../../components/LessonInputPanel';
export function LessonBuilderInputColumn({ inputProps, guide }: { inputProps: ComponentProps<typeof LessonInputPanel>; guide: ReactNode }) { return <><LessonInputPanel {...inputProps} />{guide}</>; }
