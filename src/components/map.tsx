"use client";

import React, { useState, useEffect } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  DirectionsRenderer,
  Marker,
} from "@react-google-maps/api";
import Papa from "papaparse";
import { Upload, Table, Button } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

const containerStyle = {
  width: "100%",
  height: "500px",
};

const center = {
  lat: 6.9271,
  lng: 79.8612,
};

interface RouteData {
  origin: string;
  destination: string;
  waypoint: string;
}

const MapComponent: React.FC = () => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "YOUR_GOOGLE_MAPS_API_KEY",
    libraries: ["places"],
  });

  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [tableData, setTableData] = useState<RouteData[]>([]);
  const [markers, setMarkers] = useState<{ lat: number; lng: number }[]>([]);
  const [optimizedRouteData, setOptimizedRouteData] = useState<any[]>([]);

  const handleFileUpload = (file: File) => {
    setCsvFile(file);
    return false; // Prevent upload
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
            setTableData(data); // Set data for table

            const waypoints = new Set<string>();
            data.forEach((route) => {
              waypoints.add(route.origin);
              waypoints.add(route.destination);
              route.waypoint.split('|').forEach(wp => waypoints.add(wp));
            });
            const waypointArray = Array.from(waypoints);

            const departureTime = Math.floor(Date.now() / 1000);
            const response = await fetch("/api/get-directions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ waypoints: waypointArray, departureTime }),
            });

            const distanceMatrixData = await response.json();

            const tspRoute = [0];
            const visited = new Array(waypointArray.length).fill(false);
            visited[0] = true;

            for (let i = 0; i < waypointArray.length - 1; i++) {
              let last = tspRoute[tspRoute.length - 1];
              let nearest = -1;
              let nearestTime = Number.MAX_VALUE;

              distanceMatrixData.rows[last].elements.forEach(
                (element: any, index: number) => {
                  if (!visited[index] && element.duration_in_traffic.value < nearestTime) {
                    nearest = index;
                    nearestTime = element.duration_in_traffic.value;
                  }
                }
              );

              tspRoute.push(nearest);
              visited[nearest] = true;
            }

            const optimizedRoute = tspRoute.map(index => waypointArray[index]);

            const validRoute = optimizedRoute.map(location => {
              const [lat, lng] = location.split(',').map(Number);
              if (!isNaN(lat) && !isNaN(lng)) {
                return { lat, lng };
              }
              throw new Error('Invalid location format');
            });

            const directionsService = new google.maps.DirectionsService();
            directionsService.route(
              {
                origin: validRoute[0],
                destination: validRoute[validRoute.length - 1],
                waypoints: validRoute.slice(1, -1).map((location) => ({ location, stopover: true })),
                travelMode: google.maps.TravelMode.DRIVING,
                drivingOptions: {
                  departureTime: new Date(),
                  trafficModel: google.maps.TrafficModel.BEST_GUESS,
                },
              },
              (result, status) => {
                if (status === google.maps.DirectionsStatus.OK && result) {
                  setDirections(result);
                  setOptimizedRouteData(result.routes[0].legs.map((leg, index) => ({
                    key: index,
                    start: leg.start_address,
                    end: leg.end_address,
                    distance: leg.distance?.text,
                    duration: leg.duration?.text,
                  })));
                } else {
                  console.error(`Error fetching directions: ${status}`, result);
                }
              }
            );

            setMarkers(validRoute);
          },
        });
      };
      reader.readAsText(csvFile);
    };
    fetchData();
  }, [csvFile]);

  if (!isLoaded) return <div>Loading...</div>;

  const columns = [
    {
      title: 'Origin',
      dataIndex: 'origin',
      key: 'origin',
    },
    {
      title: 'Destination',
      dataIndex: 'destination',
      key: 'destination',
    },
    {
      title: 'Waypoint',
      dataIndex: 'waypoint',
      key: 'waypoint',
    },
  ];

  const optimizedRouteColumns = [
    {
      title: 'Start',
      dataIndex: 'start',
      key: 'start',
    },
    {
      title: 'End',
      dataIndex: 'end',
      key: 'end',
    },
    {
      title: 'Distance',
      dataIndex: 'distance',
      key: 'distance',
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
    },
  ];

  return (
    <div style={{ width: '100%', maxWidth: '1200px' }}>
      <Upload beforeUpload={handleFileUpload} showUploadList={false}>
        <Button icon={<UploadOutlined />} type="primary" size="large" style={{marginBottom: '1rem'}}>
          Upload CSV
        </Button>
      </Upload>
      <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={10}>
        {directions && <DirectionsRenderer directions={directions} />}
        {markers.map((marker, index) => (
          <Marker key={index} position={marker} />
        ))}
      </GoogleMap>
      <Table 
        columns={columns} 
        dataSource={tableData} 
        rowKey="origin" 
        style={{ marginTop: '20px' }} 
        title={() => 'Original Route Data'}
      />
      <Table 
        columns={optimizedRouteColumns} 
        dataSource={optimizedRouteData} 
        style={{ marginTop: '20px' }} 
        title={() => 'Optimized Route Data'}
      />
    </div>
  );
};

export default MapComponent;