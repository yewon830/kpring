import React from 'react'
import MicIcon from '@mui/icons-material/Mic';
import PhotoCameraFrontIcon from '@mui/icons-material/PhotoCameraFront';
import MonitorIcon from '@mui/icons-material/Monitor';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import { Box } from '@mui/material';


interface VideoCallToolBarProps{
    toggleAudio : () => void; 
    toggleVideo : () => void;
    isAudioEnabled : boolean;
    isVideoEnabled : boolean;
}


// TODO : 비디오 툴바
const VideoCallToolBar: React.FC<VideoCallToolBarProps> = ({toggleAudio, toggleVideo, isAudioEnabled, isVideoEnabled}) => {
    const iconStyle = {
        color: 'green',
        padding: '2px',
        boxSizing: 'content-box',
        borderRadius: '3px',
        '&:hover': {
          backgroundColor: '#C7C8CC',
        },
      };

      const offIconStyle = {
        color: 'red',
        padding: '2px',
        boxSizing: 'content-box',
        borderRadius: '3px',
        '&:hover': {
          backgroundColor: '#C7C8CC',
        },
      };


  return (
    <Box sx={{
        backgroundColor: 'hsla(0, 0%, 100%, .9)',
        width: '200px',
        height: '48px',
        borderRadius: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingX: '8px'
    }}>
        <Box sx={{cursor: 'pointer'}}>
            {isAudioEnabled? 
                (<MicIcon sx={iconStyle} onClick={()=> toggleAudio()}/>):
                (<MicOffIcon sx={offIconStyle} onClick={()=> toggleAudio()}/>)}
            
            <ArrowDropUpIcon 
            sx={{
                borderRadius: '3px',
                '&:hover': {
                    backgroundColor: '#C7C8CC',
                }
            }}/>
        </Box>
        <Box sx={{cursor: 'pointer'}}>
            {
                isVideoEnabled? 
                (<PhotoCameraFrontIcon  sx={iconStyle} onClick={()=> toggleVideo()}/>):
                (<VideocamOffIcon sx={offIconStyle} onClick={()=> toggleVideo()}/>)
            }   
            <ArrowDropUpIcon 
            sx={{
                borderRadius: '3px',
                '&:hover': {
                    backgroundColor: '#C7C8CC',
                }
            }}
            />
        </Box>
        <Box sx={{cursor: 'pointer'}}>
            <MonitorIcon sx={iconStyle}/>
        </Box>

    </Box>
  )
}

export default VideoCallToolBar