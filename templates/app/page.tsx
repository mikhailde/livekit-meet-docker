'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { encodePassphrase, generateRoomId, randomString } from '@/lib/client-utils';
import styles from '../styles/Home.module.css';

export default function Page() {
  const router = useRouter();
  const [e2ee, setE2ee] = useState(false);
  const [sharedPassphrase, setSharedPassphrase] = useState(randomString(64));
  const [roomName, setRoomName] = useState('');

  const startMeeting = () => {
    const targetRoom = roomName.trim() || generateRoomId();
    if (e2ee) {
      router.push(`/rooms/${targetRoom}#${encodePassphrase(sharedPassphrase)}`);
    } else {
      router.push(`/rooms/${targetRoom}`);
    }
  };

  return (
    <>
      <main className={styles.main} data-lk-theme="default">
        <div className="header" style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <img src="/images/livekit-meet-home.svg" alt="Meet" width="300" height="40" />
        </div>

        <div className={styles.tabContainer}>
          <div className={styles.tabContent}>
            <input
              type="text"
              placeholder="Room name (optional)"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'inherit',
                fontSize: '0.95rem',
                boxSizing: 'border-box',
              }}
            />

            <button className="lk-button" onClick={startMeeting} style={{ width: '100%' }}>
              Join Meeting
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  id="use-e2ee"
                  type="checkbox"
                  checked={e2ee}
                  onChange={(ev) => setE2ee(ev.target.checked)}
                />
                <label htmlFor="use-e2ee" style={{ fontSize: '0.85rem' }}>End-to-end encryption (E2EE)</label>
              </div>
              {e2ee && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label htmlFor="passphrase" style={{ fontSize: '0.75rem' }}>Passphrase</label>
                  <input
                    id="passphrase"
                    type="password"
                    value={sharedPassphrase}
                    onChange={(ev) => setSharedPassphrase(ev.target.value)}
                    style={{ padding: '0.4rem', borderRadius: '0.25rem', border: '1px solid rgba(255, 255, 255, 0.2)' }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer data-lk-theme="default" style={{ textAlign: 'center', opacity: 0.5, fontSize: '0.8rem', padding: '1rem' }}>
        Secured by WebRTC
      </footer>
    </>
  );
}
