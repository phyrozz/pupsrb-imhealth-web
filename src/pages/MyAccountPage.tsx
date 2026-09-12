import { useState, useEffect } from 'react';
import {
  Title,
  Card,
  Stack,
  TextInput,
  Button,
  Group,
  Avatar,
  FileButton,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../context/AuthContext';
import { getProfile, updateProfile, getAvatarUploadUrl, updateAvatarUrl } from '../lib/api';
import axios from 'axios';

interface Profile {
  full_name: string;
  username: string;
  avatar_url: string;
}

export default function MyAccountPage() {
  const { session } = useAuth();
  const email = session?.getIdToken().payload.email ?? '';

  const [profile, setProfile] = useState<Profile>({ full_name: '', username: '', avatar_url: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    getProfile()
      .then((r) => setProfile(r.data ?? { full_name: '', username: '', avatar_url: '' }))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ full_name: profile.full_name, username: profile.username });
      notifications.show({ message: 'Profile updated!', color: 'green' });
    } catch {
      notifications.show({ message: 'Failed to update profile', color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const { data } = await getAvatarUploadUrl();
      await axios.put(data.upload_url, file, { headers: { 'Content-Type': file.type } });
      await updateAvatarUrl({ avatar_url: data.avatar_url });
      setProfile((p) => ({ ...p, avatar_url: data.avatar_url }));
      notifications.show({ message: 'Avatar updated!', color: 'green' });
    } catch {
      notifications.show({ message: 'Failed to upload avatar', color: 'red' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Title order={2} mb="xl">My Account</Title>
      <Card withBorder radius="md" p="xl" maw={480}>
        <Stack>
          <Group>
            <Avatar src={profile.avatar_url || undefined} size={64} radius="xl" />
            <FileButton onChange={handleAvatarUpload} accept="image/*">
              {(props) => (
                <Button {...props} variant="subtle" size="sm" loading={uploading}>
                  Change Photo
                </Button>
              )}
            </FileButton>
          </Group>

          <TextInput label="Email" value={email} disabled />
          <TextInput
            label="Full Name"
            value={profile.full_name}
            onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
            disabled={loading}
          />
          <TextInput
            label="Username"
            value={profile.username}
            onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))}
            disabled={loading}
          />

          <Group justify="flex-end">
            <Button onClick={handleSave} loading={saving || loading}>
              Update
            </Button>
          </Group>
        </Stack>
      </Card>
    </>
  );
}
