export const getLocalStream = async (): Promise<MediaStream> => {
    return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
};

export const createPeerConnection = () => {
    const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    return peerConnection;
};

