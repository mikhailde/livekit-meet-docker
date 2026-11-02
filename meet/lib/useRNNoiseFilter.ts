import * as React from 'react';
import { LocalAudioTrack } from 'livekit-client';
import { useLocalParticipant, type TrackReferenceOrPlaceholder } from '@livekit/components-react';
import type { RNNoiseOptions, RNNoiseTrackProcessor } from 'livekit-rnnoise-processor';

export interface UseRNNoiseFilterOptions {
  trackRef?: TrackReferenceOrPlaceholder;
  filterOptions?: RNNoiseOptions;
}

export function useRNNoiseFilter(options: UseRNNoiseFilterOptions = {}) {
  const [shouldEnable, setShouldEnable] = React.useState(false);
  const [isNoiseFilterPending, setIsNoiseFilterPending] = React.useState(false);
  const [isNoiseFilterEnabled, setIsNoiseFilterEnabled] = React.useState(false);
  const [processor, setProcessor] = React.useState<RNNoiseTrackProcessor>();

  const filterOptionsRef = React.useRef(options.filterOptions);
  React.useEffect(() => {
    filterOptionsRef.current = options.filterOptions;
  }, [options.filterOptions]);

  const localParticipant = useLocalParticipant();
  const micPublication = options.trackRef?.publication ?? localParticipant.microphoneTrack;

  const setNoiseFilterEnabled = React.useCallback(async (enable: boolean) => {
    if (enable && !processor && typeof window !== 'undefined') {
      const { RNNoiseTrackProcessor: ProcessorClass } = await import('livekit-rnnoise-processor');
      if (!ProcessorClass.isSupported()) {
        console.warn('RNNoise filter is not supported in this browser');
        return;
      }
      setProcessor(
        new ProcessorClass({
          ...filterOptionsRef.current,
          workletCDNURL: filterOptionsRef.current?.workletCDNURL ?? `${window.location.origin}/rnnoise/`,
        })
      );
    }
    
    setShouldEnable((prev) => {
      if (prev !== enable) setIsNoiseFilterPending(true);
      return enable;
    });
  }, [processor]);

  React.useEffect(() => {
    const track = micPublication?.track;
    if (!track || !(track instanceof LocalAudioTrack) || !processor) return;

    let isMounted = true; 

    const toggleProcessor = async () => {
      setIsNoiseFilterPending(true);
      try {
        const currentProcessor = track.getProcessor();
        
        if (currentProcessor?.name === 'rnnoise-track-processor') {
          await (currentProcessor as RNNoiseTrackProcessor).setEnabled(shouldEnable);
          if (isMounted) setIsNoiseFilterEnabled(shouldEnable);
        } else if (shouldEnable) {
          await track.setProcessor(processor);
          await processor.setEnabled(true);
          if (isMounted) setIsNoiseFilterEnabled(true);
        }
      } catch (e) {
        console.error('RNNoise filter error:', e);
        if (isMounted) setIsNoiseFilterEnabled(false);
      } finally {
        if (isMounted) setIsNoiseFilterPending(false);
      }
    };

    toggleProcessor();

    return () => {
      isMounted = false;
    };
  }, [shouldEnable, micPublication?.track, processor]);

  return {
    setNoiseFilterEnabled,
    isNoiseFilterEnabled,
    isNoiseFilterPending,
    processor,
  };
}