import { ref, uploadBytesResumable, getDownloadURL, type UploadTaskSnapshot } from 'firebase/storage'
import { storage } from '../firebase/config'

export type ImageUploadProgress = {
  fileName: string
  progress: number
  status: 'queued' | 'uploading' | 'done' | 'error'
}

export function isStorageConfigured(): boolean {
  return Boolean(storage)
}

export async function uploadPropertyImages(
  files: File[],
  ownerId: string,
  onProgress?: (items: ImageUploadProgress[]) => void,
): Promise<string[]> {
  if (!storage) {
    return []
  }

  const urlList: string[] = []
  const progressItems: ImageUploadProgress[] = files.map((file) => ({
    fileName: file.name,
    progress: 0,
    status: 'queued',
  }))

  onProgress?.(progressItems)

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]
    const uniqueName = `${Date.now()}-${index}-${file.name.replace(/\s+/g, '-')}`
    const fileRef = ref(storage, `properties/${ownerId}/${uniqueName}`)

    const nextProgress = [...progressItems]
    nextProgress[index] = { ...nextProgress[index], status: 'uploading' }
    onProgress?.(nextProgress)

    const uploadTask = uploadBytesResumable(fileRef, file)

    await new Promise<void>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot: UploadTaskSnapshot) => {
          const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          const current = [...progressItems]
          current[index] = { ...current[index], progress: percent, status: 'uploading' }
          onProgress?.(current)
        },
        (error) => {
          const current = [...progressItems]
          current[index] = { ...current[index], progress: 0, status: 'error' }
          onProgress?.(current)
          reject(error)
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref)
            urlList.push(downloadUrl)
            const current = [...progressItems]
            current[index] = { ...current[index], progress: 100, status: 'done' }
            onProgress?.(current)
            resolve()
          } catch (error) {
            const current = [...progressItems]
            current[index] = { ...current[index], status: 'error' }
            onProgress?.(current)
            reject(error)
          }
        },
      )
    })
  }

  return urlList
}
