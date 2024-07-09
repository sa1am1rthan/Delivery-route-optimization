"use client";

import React, { useState, useEffect, ChangeEvent } from 'react';
import { GoogleMap, useJsApiLoader, DirectionsRenderer } from '@react-google-maps/api';
import Papa from 'papaparse';
import FileUpload from '../FileUpload';

const containerStyle = {
  width: '100vw',
  height: '100vh'
};

const center = {
  lat: 6.9271,
  lng: 79.8612
};

interface RouteData {
  origin: string;
  destination: string;
  waypoint: string;
}

const MapComponent: React.FC = () => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '',
    libraries: ['places']
  });

  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setCsvFile(event.target.files[0]);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!csvFile) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        const csv = e.target?.result as string;
        Papa.parse<RouteData>(csv, {
          header: true,
          complete: async (results) => {
            const data = results.data;

            // Extracting unique waypoints
            const waypoints = new Set<string>();
            data.forEach(route => {
              waypoints.add(route.origin);
              waypoints.add(route.destination);
              waypoints.add(route.waypoint);
            });
            const waypointArray = Array.from(waypoints);

            // Fetching distance matrix data from the server-side API
            const departureTime = Math.floor(Date.now() / 1000); // Current time in seconds since epoch
            const response = await fetch('/api/get-directions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ waypoints: waypointArray, departureTime })
            });

            const distanceMatrixData = await response.json();

            // Nearest Neighbor TSP Algorithm considering travel time
            const tspRoute = [0];
            const visited = new Array(waypointArray.length).fill(false);
            visited[0] = true;

            for (let i = 0; i < waypointArray.length - 1; i++) {
              let last = tspRoute[tspRoute.length - 1];
              let nearest = -1;
              let nearestTime = Number.MAX_VALUE;

              // Finding the nearest unvisited waypoint based on travel time
              distanceMatrixData.rows[last].elements.forEach((element: any, index: number) => {
                if (!visited[index] && element.duration_in_traffic.value < nearestTime) {
                  nearest = index;
                  nearestTime = element.duration_in_traffic.value;
                }
              });

              tspRoute.push(nearest);
              visited[nearest] = true;
            }

            const optimizedRoute = tspRoute.map(index => waypointArray[index]);

            // Requesting directions for the optimized route
            const directionsService = new google.maps.DirectionsService();
            directionsService.route(
              {
                origin: optimizedRoute[0],
                destination: optimizedRoute[optimizedRoute.length - 1],
                waypoints: optimizedRoute.slice(1, -1).map(location => ({ location })),
                travelMode: google.maps.TravelMode.DRIVING,
                drivingOptions: {
                  departureTime: new Date(), // Current time
                  trafficModel: google.maps.TrafficModel.BEST_GUESS
                }
              },
              (result, status) => {
                if (status === google.maps.DirectionsStatus.OK) {
                  setDirections(result);
                } else {
                  console.error(`error fetching directions ${result}`);
                }
              }
            );
          }
        });
      };
      reader.readAsText(csvFile);
    };
    fetchData();
  }, [csvFile]);

  if (!isLoaded) return <div>Loading...</div>;

  return (
    <div>
      <FileUpload onFileUpload={handleFileUpload} />
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={10}
      >
        {directions && <DirectionsRenderer directions={directions} />}
      </GoogleMap>
    </div>
  );
};

export default MapComponent;
