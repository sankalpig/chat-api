import { useState, useEffect, useRef } from 'react';
import { socket } from '../services/socket';
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../services/SocketContext';

const VideoCall = () => {
    const { callerSignalData } = useSocket();
    // const { signal } = callerSignalData;
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [callAccepted, setCallAccepted] = useState(false);
    const [receivingCall, setReceivingCall] = useState(false);
    const [callerSignal, setCallerSignal] = useState(callerSignalData?.signal || null);

    const navigate = useNavigate();
    const { roomId } = useParams();
    const localVideoRef = useRef();
    const remoteVideoRef = useRef();
    const peerRef = useRef();

    console.log(callerSignalData?.signal, " >>>> callerSignalData",);

    const startCall = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);

        if (!peerRef.current) {
            peerRef.current = createPeerConnection();
        }

        stream.getTracks().forEach(track => peerRef.current.addTrack(track, stream));

        const offer = await peerRef.current.createOffer();
        await peerRef.current.setLocalDescription(offer);

        socket.emit('callUser', {
            roomId,
            signalData: offer,
            from: socket.id
        });
    };

    const createPeerConnection = () => {
        const peer = new RTCPeerConnection();

        peer.ontrack = event => {
            if (event.streams && event.streams[0]) {
                setRemoteStream(event.streams[0]);
            }
        };

        peer.onicecandidate = event => {
            if (event.candidate) {
                socket.emit('callUser', {
                    roomId,
                    signalData: event.candidate,
                    from: socket.id
                });
            }
        };

        return peer;
    };

    const handleCallAnswer = async () => {
        if (!peerRef.current) {
            peerRef.current = createPeerConnection();
        }

        // Ensure callerSignal is an SDP
        if (callerSignal && callerSignal.type && callerSignal.sdp) {
            const desc = new RTCSessionDescription(callerSignal);
            await peerRef.current.setRemoteDescription(desc);

            const answer = await peerRef.current.createAnswer();
            await peerRef.current.setLocalDescription(answer);

            socket.emit('answerCall', { to: roomId, signal: answer });
            setCallAccepted(true);
        } else {
            console.error("Invalid callerSignal:", callerSignal);
        }
    };

    const endCall = () => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        if (peerRef.current) {
            peerRef.current.close();
        }
        setLocalStream(null);
        setRemoteStream(null);
        navigate(`/`);
    };

    useEffect(() => {
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
        }

        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
        }

        socket.on('callUser', ({ signal, from }) => {
            if (signal.type && signal.sdp) {
                setReceivingCall(true);
                setCallerSignal(signal);
            } else if (signal.candidate) {
                // Received an ICE candidate
                if (peerRef.current) {
                    peerRef.current.addIceCandidate(new RTCIceCandidate(signal))
                        .catch(e => console.error("Error adding received ICE candidate", e));
                }
            }
        });

        socket.on('callAccepted', (signal) => {
            if (signal.type && signal.sdp && peerRef.current) {
                peerRef.current.setRemoteDescription(new RTCSessionDescription(signal))
                    .catch(e => console.error("Error setting remote description", e));
                setCallAccepted(true);
            }
        });

        return () => {
            socket.off('callUser');
            socket.off('callAccepted');
        };
    }, [localStream, remoteStream]);
    console.log(receivingCall, callAccepted);
    return (
        <div>
            {/* Local Video Stream */}
            <video
                ref={localVideoRef}
                autoPlay
                style={{ width: '500px', border: '1px solid black', margin: '10px' }}
            />

            {/* Remote Video Stream */}
            <video
                ref={remoteVideoRef}
                autoPlay
                style={{ width: '300px', border: '1px solid black', margin: '10px' }}
            />

            {/* Buttons Based on Call State */}
            {/* {receivingCall && !callAccepted ? ( */}
            <button onClick={handleCallAnswer}>Answer Call</button>
            {/* ) : callAccepted ? ( */}
            <button onClick={endCall}>End Call</button>
            {/* ) : ( */}
            <button onClick={startCall}>Start Call</button>
            {/* )} */}
        </div>
    );
};
export default VideoCall;
