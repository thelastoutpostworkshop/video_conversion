<template>
  <v-file-input
    :model-value="modelValue"
    label="Source media"
    prepend-icon="mdi-file-video"
    accept="video/*,audio/*,.mjpeg,.mjpg,.avi,.mov,.mkv,.mp4,.webm"
    density="compact"
    hide-details="auto"
    :disabled="disabled"
    @update:model-value="onUpdate"
  />
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: File | null;
  disabled: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: File | null];
}>();

const onUpdate = (value: File | File[] | null) => {
  const next = Array.isArray(value) ? (value[0] ?? null) : value;
  emit("update:modelValue", next);
};
</script>
