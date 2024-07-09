import axios from 'axios';

const apiKey=process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export const getDistanceMatrix= async (origins,destinations)=>{
    const response=await axios.get('https://map.googleapis.com/maps/api/distancematrix/json',{
        params: {
            origins: origins.join('|'),
            destinations:destinations.join('|'),
            key: apiKey
        }
    });
    return response.data;
};

export const getOptimizedRoute= async (waypoints) => {
    const response = await axios.get('https://map.googleapis.com/maps/api/distancematrix/json',{
        params:{
            origin: waypoints[0],
            destination:waypoints[waypoints.length-1],
            waypoints: waypoints.slice(1,-1).join('|'),
            optimizedwaypoints:true,
            key: apiKey
        }
    });
    return response.data;
};