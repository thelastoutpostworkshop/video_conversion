<template>
  <v-card variant="tonal">
    <v-card-title class="text-subtitle-2">Source metadata</v-card-title>
    <v-card-text>
      <div class="text-body-2">
        {{ label }}
      </div>
      <v-progress-linear
        v-if="loading"
        indeterminate
        height="4"
        class="mt-3"
      />
      <v-alert
        v-else-if="error"
        type="warning"
        variant="tonal"
        class="mt-3"
      >
        {{ error }}
      </v-alert>
      <div class="text-caption text-medium-emphasis mt-3">
        Metadata is read automatically for video sources.
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  loading: boolean;
  error: string | null;
}>();
</script>
