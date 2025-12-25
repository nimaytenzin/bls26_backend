export class PublicPageSettingsDto {
  id: number;
  mapVisualizationMode: 'households' | 'enumerationAreas';
  selectedBasemapId: string;
  colorScale: string;
  nationalDataViewerTitle: string;
  nationalDataViewerDescription: string;
  nationalDataViewerInfoBoxContent: string;
  nationalDataViewerInfoBoxStats: string;
  createdBy?: number;
  updatedBy?: number;
  createdAt: string;
  updatedAt: string;
}

