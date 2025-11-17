import { API_BASE_URL } from "@/lib/constants";

export interface TextExtractionResponse {
  text: string;
}

export const textExtractorAPI = {
  async extractText(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/api/extract-text`, {
      method: "POST",
      mode: "cors",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data: TextExtractionResponse = await response.json();
    return data.text;
  },
};