// A short, low-volume mechanical tap. Build the noise buffer once, then let
// Web Audio schedule and clean up each click without React animation state.
export function createDeskClick(context: AudioContext) {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * .03), context.sampleRate)
  const samples = buffer.getChannelData(0)
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1
  let previous = -1
  return () => {
    const time = context.currentTime
    if (time - previous < .045) return
    previous = time
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain()
    source.buffer = buffer; filter.type = 'highpass'; filter.frequency.value = 2400
    gain.gain.setValueAtTime(.018, time); gain.gain.exponentialRampToValueAtTime(.0001, time + .022)
    source.connect(filter); filter.connect(gain); gain.connect(context.destination)
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect() }
    source.start(time); source.stop(time + .03)
  }
}
