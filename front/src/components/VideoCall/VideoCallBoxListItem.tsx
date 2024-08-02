import React, { useEffect, useRef, useState } from 'react'
import { Box } from '@mui/material';
import { ServerMember } from '../../types/server';

interface MemberListItemProps{
  member: ServerMember;
}

interface VideoListItemProps {
  stream: MediaStream;
}


const VideoCallBoxListItem : React.FC<VideoListItemProps>= ({stream}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleShareScreen = () => {
    setIsSharing(!isSharing);
  };
  return (
    <Box sx={{
      height:'100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
      }}>
        <Box sx={{
          backgroundColor: '#424241',
          width: '80%',
          height: '80%',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0px 5px 10px -3px #424241',
          position: 'relative'
        }}>
        <video ref={videoRef} autoPlay className='w-full h-full rounded-2xl'></video>
          <Box>
            {/* <Box sx={{
              color: 'white', 
              position:'absolute',
              bottom: '8px',
              right: '16px'
              }}>{member.name}</Box> */}
          </Box>
        </Box>
    </Box>
  )
}

export default VideoCallBoxListItem