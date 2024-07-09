"use client";

import React, { useState, useEffect, ChangeEvent } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  DirectionsRenderer,
  Marker,
} from "@react-google-maps/api";
import Papa from "papaparse";
import { Upload, message, Table, Button } from 'antd';
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
    googleMapsApiKey:"AIzaSyCi3KFlsvGzR75m6BatZVI4phrXT8MsGHU", 
    libraries: ["places"],
  });

  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [tableData, setTableData] = useState<RouteData[]>([]);
  const [markers, setMarkers] = useState<{ lat: number; lng: number }[]>([]);
  const [optimizedRouteData, setOptimizedRouteData] = useState<{ key: string; label: string; coordinate: string }[]>([]);


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
            
            setOptimizedRouteData(optimizedRoute.map((coord, index) => ({
              key: index.toString(),
              label: String.fromCharCode(65 + index),
              coordinate: coord
            })));

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
                if (status === google.maps.DirectionsStatus.OK) {
                  setDirections(result);
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
      title: 'Stop',
      dataIndex: 'label',
      key: 'label',
    },
    {
      title: 'Coordinate',
      dataIndex: 'coordinate',
      key: 'coordinate',
    },
  ];

  return (
    <div style={{ width: '100%', maxWidth: '1200px' }}>
      <Upload beforeUpload={handleFileUpload} showUploadList={false}>
        <Button type="primary" size="large" style={{marginBottom: '1rem'}} icon={<UploadOutlined />}>Upload CSV</Button>
      </Upload>
      <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={10}>
        {directions && <DirectionsRenderer directions={directions} />}
        {markers.map((marker, index) => (
          <Marker key={index} position={marker} />
        ))}
      </GoogleMap>
      <Table columns={columns} dataSource={tableData} rowKey="origin" style={{ marginTop: '20px' }} 
        title={() => 'Uploaded Unoptimized Route'}
      />
      <Table 
        columns={optimizedRouteColumns} 
        dataSource={optimizedRouteData} 
        pagination={false}
        style={{ marginTop: '20px' }} 
        title={() => 'Optimized Route'}
      />
    </div>
  );
};

export default MapComponent;
