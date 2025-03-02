"use client";

import { useEffect, useRef, useState } from "react";
import { createPeerConnection, getLocalStream } from "@/app/lib/webrtc";

export default function VideoCall() {
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        wsRef.current = new WebSocket("ws://localhost:8080");

        wsRef.current.onopen = () => {
            console.log("✅ WebSocket was connected");
            setConnected(true);
        };

        wsRef.current.onmessage = async (event) => {
            const message = JSON.parse(event.data);
            console.log("📩 Message:", message);

            switch (message.type) {
                case "offer":
                    await handleOffer(message.data);
                    break;
                case "answer":
                    await handleAnswer(message.data);
                    break;
                case "ice-candidate":
                    await handleIceCandidate(message.data);
                    break;
            }
        };

        wsRef.current.onclose = () => {
            console.log("❌ WebSocket disconnected");
            setConnected(false);
        };

        return () => {
            wsRef.current?.close();
        };
    }, []);

    const initializePeerConnection = async () => {
        if (peerConnectionRef.current) return;
        peerConnectionRef.current = createPeerConnection();

        const stream = await getLocalStream();
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        stream.getTracks().forEach((track) => {
            peerConnectionRef.current?.addTrack(track, stream);
        });

        peerConnectionRef.current.onicecandidate = (event) => {
            if (event.candidate && wsRef.current) {
                wsRef.current.send(JSON.stringify({ type: "ice-candidate", data: event.candidate.toJSON() }));
            }
        };

        peerConnectionRef.current.ontrack = (event) => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };
    };

    const createOffer = async () => {
        await initializePeerConnection();
        if (!peerConnectionRef.current || !wsRef.current) return;

        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
        wsRef.current.send(JSON.stringify({ type: "offer", data: offer }));
    };

    const handleOffer = async (offer: RTCSessionDescriptionInit) => {
        await initializePeerConnection();
        if (!peerConnectionRef.current) return;

        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        wsRef.current?.send(JSON.stringify({ type: "answer", data: answer }));
    };

    const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
        if (!peerConnectionRef.current) return;

        if (peerConnectionRef.current.signalingState !== "have-local-offer") {
            console.warn("⚠️ Ignoring answer: Wrong signaling state", peerConnectionRef.current.signalingState);
            return;
        }

        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    };


    const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
        if (!peerConnectionRef.current) return;
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <h1 className="text-xl">🎥 Video call</h1>

            <div className="flex justify-center p-5 gap-8">
                <video ref={localVideoRef} autoPlay muted className="w-180 h-180 border"/>
                <video ref={remoteVideoRef} autoPlay className="w-180 h-180 border"/>
            </div>

            {connected ? (
                <button className="bg-blue-500 text-white p-2 rounded mt-5" onClick={createOffer}>
                    🔗 Start call
                </button>
            ) : (
                <p className="text-red-500 mt-auto mb-4">⏳ Waiting to server connect...</p>
            )}
        </div>

    );
}
