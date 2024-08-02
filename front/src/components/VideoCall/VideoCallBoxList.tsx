import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import VideoCallBoxListItem from './VideoCallBoxListItem'
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { Box } from '@mui/material';
import axios from 'axios';
import { useParams } from 'react-router';
import { ServerMember } from '../../types/server';
import { io, Socket } from 'socket.io-client';


interface Peer {
  id: string;
  stream: MediaStream;
}



const VideoCallBoxList = () => {
  const socket: Socket = io('https://localhost:5001');
  const [peers, setPeers] = useState<Peer[]>([]);
  const localStreamRef = useRef<HTMLVideoElement>(null);
  const peerConnections = useRef<{ [key: string]: RTCPeerConnection }>({});

  // 참가자 비디오 처리
  const handleSocketEvents = (stream: MediaStream) => {
    socket.on('offer', async (data: { sdp: RTCSessionDescriptionInit; sender: string }) => {
      const peerConnection = new RTCPeerConnection();
      peerConnections.current[data.sender] = peerConnection;

      // 다른 참가자의 트랙을 추가
      peerConnection.ontrack = (event) => {
        setPeers((prevPeers) => [
          ...prevPeers,
          { id: data.sender, stream: event.streams[0] }
        ]);
      };

      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('answer', { sdp: answer, room: 'some-room-name' });
    });

    socket.on('answer', async (data: { sdp: RTCSessionDescriptionInit; sender: string }) => {
      const peerConnection = peerConnections.current[data.sender];
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
      }
    });

    socket.on('candidate', async (data: { candidate: RTCIceCandidateInit; sender: string }) => {
      const peerConnection = peerConnections.current[data.sender];
      if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    socket.on('user-disconnected', (data: { userId: string }) => {
      peerConnections.current[data.userId]?.close();
      delete peerConnections.current[data.userId];
      setPeers((prevPeers) => prevPeers.filter(peer => peer.id !== data.userId));
    });
  };
    // 소켓 이벤트 처리
    useEffect(() => {
      // 소켓 이벤트 설정
      handleSocketEvents(null);
      
    }, []);
  
    // 화면 공유 함수
    const getLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localStreamRef.current) {
          localStreamRef.current.srcObject = stream;
        }
        // 방에 참가
        socket.emit('join', { room: 'some-room-name' });
  
        // 내 비디오 스트림 추가
        for (const peerId in peerConnections.current) {
          const peerConnection = peerConnections.current[peerId];
          stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
        }
  
      } catch (error) {
        console.error('Error accessing media devices.', error);
      }
    };
  
    // 화면 공유 버튼 클릭 핸들러
    const handleShareScreen = async () => {
      await getLocalStream(); // 화면 공유 시작
    };



  
  const [curVideoCallBoxPage, setCurVideoCallBoxPage] = useState(0);
  const [slicedMemberList, setSlicedMemberList] = useState<ServerMember[]>([]); // 페이징 처리 된 멤버 리스트
  const [serverMemberList, setServerMemberList] = useState([]);
  // FIXME : 해당 API axios 인터셉터 개발되면 수정 필요
  const accessToken = localStorage.getItem('dicoTown_AccessToken');
  const getServerMember = useCallback(()=>{
    axios.get(`http://kpring.duckdns.org/server/api/v1/server/66795ea1981fc767b76ca9d0`,{
      headers: {'Authorization': `${accessToken}`}
    })
    .then(response=>{
      setServerMemberList(response.data.data.users);
    })
    .catch(err=>console.log(err))
  },[accessToken])


  // 마지막 페이지 수
  const lastPage = useMemo(()=>{
    const memberCnt = serverMemberList.length;
    let lastPage = 0;
    if(memberCnt%4 === 0){
      lastPage = Math.floor(memberCnt/4) - 1
    }else{
      lastPage = Math.floor(memberCnt/4)
    }
    return lastPage
  },[serverMemberList])

  // 화면 공유 박스 이전 페이지 이동 핸들링 함수
  const handleBoxPagePrev = useCallback(()=>{
    let curPage = curVideoCallBoxPage;
    if(curPage!==0){
      setCurVideoCallBoxPage(curPage - 1)
    }
  },[curVideoCallBoxPage])

  // 화면 공유 박스 다음 페이지 이동 핸들링 함수
  const handleBoxPageNext = useCallback(()=>{
    if(curVideoCallBoxPage!==lastPage){
      let curPage = curVideoCallBoxPage;
      setCurVideoCallBoxPage(curPage + 1)
    }
  },[curVideoCallBoxPage,lastPage])


  // 화면공유 멤버 리스트 슬라이싱 함수 
  const sliceMemberList = useCallback(()=>{
    const newMemberList = serverMemberList.slice(curVideoCallBoxPage*4, (curVideoCallBoxPage*4)+4);
    setSlicedMemberList(newMemberList)
  },[curVideoCallBoxPage, serverMemberList])

  // 무한루프 방지를 위해 useEffect 분리
  useEffect(()=>{
    getServerMember();
  },[getServerMember])

  useEffect(() => {
    sliceMemberList();
  }, [sliceMemberList]);


  return (
    <Box sx={{width: '880px', height:'160px', display:'flex', alignItems:'center'}}>
      <ArrowBackIosIcon 
      sx={{
        color: `${curVideoCallBoxPage === 0 ? 'gray': 'black'}`,
        cursor: 'pointer'
      }}
      onClick={handleBoxPagePrev} />
      <Box   sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        height: '100%',
        width: '100%'
      }}>
        <video ref={localStreamRef} autoPlay playsInline muted />
        {peers.map((peer) => (
          <VideoCallBoxListItem key={peer.id} stream={peer.stream} />
        ))}
      </Box>
      <ArrowForwardIosIcon 
      sx={{
        color: `${curVideoCallBoxPage === 0 ? 'gray': 'black'}`,
        cursor: 'pointer'
      }}
      onClick={handleBoxPageNext}
      />
    </Box>
  )
}

export default VideoCallBoxList