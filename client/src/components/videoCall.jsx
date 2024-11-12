import { useState, useEffect } from 'react';

const VideoCall = () => {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);

    const startCall = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        // Setup WebRTC peer connection and emit "callUser" to server
    };

    const endCall = () => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        // Disconnect WebRTC peer connection and emit "disconnectCall" to server
    };

    return (
        <div>
            <video ref={(video) => video && (video.srcObject = localStream)} autoPlay />
            <video ref={(video) => video && (video.srcObject = remoteStream)} autoPlay />
            <button onClick={startCall}>Start Call</button>
            <button onClick={endCall}>End Call</button>
        </div>
    );
};

export default VideoCall;
