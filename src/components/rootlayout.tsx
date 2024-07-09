"use client"

import 'antd/dist/reset.css'; // Import Ant Design styles
import '../app/globals.css'; // Import custom global styles
import { Layout, Menu } from 'antd';

const { Header, Content } = Layout;
export default function AntRootLayout({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
    return (
        <Layout>
            <Header>
              <Menu theme="dark" mode="horizontal">
                <Menu.Item key="1">Route Optimizer</Menu.Item>
              </Menu>
            </Header>
            <Content style={{ padding: '50px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {children}
            </Content>
        </Layout>
    );
  }
  


