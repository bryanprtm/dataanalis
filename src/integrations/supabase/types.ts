export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_analyses: {
        Row: {
          created_at: string
          id: string
          isu_menonjol: string | null
          laporan_id: string | null
          potensi_kerawanan: string | null
          prediksi: string | null
          raw_json: Json | null
          rekomendasi: string | null
          ringkasan: string | null
          risiko: Database["public"]["Enums"]["urgensi_level"] | null
          sentimen: Database["public"]["Enums"]["sentimen"] | null
        }
        Insert: {
          created_at?: string
          id?: string
          isu_menonjol?: string | null
          laporan_id?: string | null
          potensi_kerawanan?: string | null
          prediksi?: string | null
          raw_json?: Json | null
          rekomendasi?: string | null
          ringkasan?: string | null
          risiko?: Database["public"]["Enums"]["urgensi_level"] | null
          sentimen?: Database["public"]["Enums"]["sentimen"] | null
        }
        Update: {
          created_at?: string
          id?: string
          isu_menonjol?: string | null
          laporan_id?: string | null
          potensi_kerawanan?: string | null
          prediksi?: string | null
          raw_json?: Json | null
          rekomendasi?: string | null
          ringkasan?: string | null
          risiko?: Database["public"]["Enums"]["urgensi_level"] | null
          sentimen?: Database["public"]["Enums"]["sentimen"] | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_analyses_laporan_id_fkey"
            columns: ["laporan_id"]
            isOneToOne: false
            referencedRelation: "laporan"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      arsip: {
        Row: {
          created_at: string
          deskripsi: string | null
          file_name: string | null
          file_url: string | null
          id: string
          judul: string
          kategori: Database["public"]["Enums"]["arsip_kategori"]
          nomor: string | null
          tanggal: string | null
          uploaded_by: string | null
          wilayah: string | null
        }
        Insert: {
          created_at?: string
          deskripsi?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          judul: string
          kategori: Database["public"]["Enums"]["arsip_kategori"]
          nomor?: string | null
          tanggal?: string | null
          uploaded_by?: string | null
          wilayah?: string | null
        }
        Update: {
          created_at?: string
          deskripsi?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          judul?: string
          kategori?: Database["public"]["Enums"]["arsip_kategori"]
          nomor?: string | null
          tanggal?: string | null
          uploaded_by?: string | null
          wilayah?: string | null
        }
        Relationships: []
      }
      generated_reports: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          judul: string
          konten: string
          metadata: Json | null
          periode: string
          ringkasan: string | null
          tanggal_mulai: string | null
          tanggal_selesai: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          judul: string
          konten: string
          metadata?: Json | null
          periode: string
          ringkasan?: string | null
          tanggal_mulai?: string | null
          tanggal_selesai?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          judul?: string
          konten?: string
          metadata?: Json | null
          periode?: string
          ringkasan?: string | null
          tanggal_mulai?: string | null
          tanggal_selesai?: string | null
        }
        Relationships: []
      }
      kegiatan: {
        Row: {
          created_at: string
          created_by: string | null
          deskripsi: string | null
          id: string
          images: Json | null
          judul: string
          kategori: string | null
          lokasi: string | null
          mulai: string
          prediksi_ai: string | null
          selesai: string | null
          updated_at: string
          urgensi: Database["public"]["Enums"]["urgensi_level"] | null
          wilayah: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deskripsi?: string | null
          id?: string
          images?: Json | null
          judul: string
          kategori?: string | null
          lokasi?: string | null
          mulai: string
          prediksi_ai?: string | null
          selesai?: string | null
          updated_at?: string
          urgensi?: Database["public"]["Enums"]["urgensi_level"] | null
          wilayah?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deskripsi?: string | null
          id?: string
          images?: Json | null
          judul?: string
          kategori?: string | null
          lokasi?: string | null
          mulai?: string
          prediksi_ai?: string | null
          selesai?: string | null
          updated_at?: string
          urgensi?: Database["public"]["Enums"]["urgensi_level"] | null
          wilayah?: string | null
        }
        Relationships: []
      }
      laporan: {
        Row: {
          attachments: Json | null
          created_at: string
          created_by: string | null
          id: string
          isi: string
          jenis: Database["public"]["Enums"]["laporan_jenis"]
          judul: string
          lat: number | null
          lng: number | null
          lokasi: string | null
          polda: string | null
          status: Database["public"]["Enums"]["laporan_status"]
          subden: string | null
          sumber: string | null
          tags: string[] | null
          tanggal_kejadian: string | null
          updated_at: string
          urgensi: Database["public"]["Enums"]["urgensi_level"]
          verified_at: string | null
          verified_by: string | null
          wilayah: string | null
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          isi: string
          jenis: Database["public"]["Enums"]["laporan_jenis"]
          judul: string
          lat?: number | null
          lng?: number | null
          lokasi?: string | null
          polda?: string | null
          status?: Database["public"]["Enums"]["laporan_status"]
          subden?: string | null
          sumber?: string | null
          tags?: string[] | null
          tanggal_kejadian?: string | null
          updated_at?: string
          urgensi?: Database["public"]["Enums"]["urgensi_level"]
          verified_at?: string | null
          verified_by?: string | null
          wilayah?: string | null
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          isi?: string
          jenis?: Database["public"]["Enums"]["laporan_jenis"]
          judul?: string
          lat?: number | null
          lng?: number | null
          lokasi?: string | null
          polda?: string | null
          status?: Database["public"]["Enums"]["laporan_status"]
          subden?: string | null
          sumber?: string | null
          tags?: string[] | null
          tanggal_kejadian?: string | null
          updated_at?: string
          urgensi?: Database["public"]["Enums"]["urgensi_level"]
          verified_at?: string | null
          verified_by?: string | null
          wilayah?: string | null
        }
        Relationships: []
      }
      notifikasi: {
        Row: {
          created_at: string
          dibaca: boolean | null
          id: string
          jenis: string | null
          judul: string
          link: string | null
          pesan: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dibaca?: boolean | null
          id?: string
          jenis?: string | null
          judul: string
          link?: string | null
          pesan: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dibaca?: boolean | null
          id?: string
          jenis?: string | null
          judul?: string
          link?: string | null
          pesan?: string
          user_id?: string | null
        }
        Relationships: []
      }
      pengumuman: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          isi: string
          judul: string
          prioritas: Database["public"]["Enums"]["urgensi_level"] | null
          target_subden: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          isi: string
          judul: string
          prioritas?: Database["public"]["Enums"]["urgensi_level"] | null
          target_subden?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          isi?: string
          judul?: string
          prioritas?: Database["public"]["Enums"]["urgensi_level"] | null
          target_subden?: string | null
        }
        Relationships: []
      }
      peralatan: {
        Row: {
          catatan: string | null
          created_at: string
          created_by: string | null
          id: string
          jumlah: number
          kategori: string | null
          kondisi: Database["public"]["Enums"]["kondisi_alat"]
          lokasi: string | null
          nama: string
          perlu_perawatan: boolean | null
          riwayat_pemeliharaan: Json | null
          serial_number: string | null
          subden: string | null
          updated_at: string
        }
        Insert: {
          catatan?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          jumlah?: number
          kategori?: string | null
          kondisi?: Database["public"]["Enums"]["kondisi_alat"]
          lokasi?: string | null
          nama: string
          perlu_perawatan?: boolean | null
          riwayat_pemeliharaan?: Json | null
          serial_number?: string | null
          subden?: string | null
          updated_at?: string
        }
        Update: {
          catatan?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          jumlah?: number
          kategori?: string | null
          kondisi?: Database["public"]["Enums"]["kondisi_alat"]
          lokasi?: string | null
          nama?: string
          perlu_perawatan?: boolean | null
          riwayat_pemeliharaan?: Json | null
          serial_number?: string | null
          subden?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      personil: {
        Row: {
          catatan: string | null
          created_at: string
          created_by: string | null
          dsp: number
          id: string
          pelatihan: Json
          polda: string | null
          riil: number
          satuan: string | null
          subden: string
          updated_at: string
        }
        Insert: {
          catatan?: string | null
          created_at?: string
          created_by?: string | null
          dsp?: number
          id?: string
          pelatihan?: Json
          polda?: string | null
          riil?: number
          satuan?: string | null
          subden: string
          updated_at?: string
        }
        Update: {
          catatan?: string | null
          created_at?: string
          created_by?: string | null
          dsp?: number
          id?: string
          pelatihan?: Json
          polda?: string | null
          riil?: number
          satuan?: string | null
          subden?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          nama: string
          nrp: string | null
          pangkat: string | null
          polda: string | null
          satuan: string | null
          subden: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          nama: string
          nrp?: string | null
          pangkat?: string | null
          polda?: string | null
          satuan?: string | null
          subden?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          nama?: string
          nrp?: string | null
          pangkat?: string | null
          polda?: string | null
          satuan?: string | null
          subden?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tools_links: {
        Row: {
          created_at: string
          deskripsi: string | null
          id: string
          ikon: string | null
          kategori: string | null
          nama: string
          url: string
        }
        Insert: {
          created_at?: string
          deskripsi?: string | null
          id?: string
          ikon?: string | null
          kategori?: string | null
          nama: string
          url: string
        }
        Update: {
          created_at?: string
          deskripsi?: string | null
          id?: string
          ikon?: string | null
          kategori?: string | null
          nama?: string
          url?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin_sat"
        | "admin_subden"
        | "operator"
        | "viewer"
      arsip_kategori:
        | "laporan"
        | "surat"
        | "dokumentasi"
        | "intelijen"
        | "cyber"
        | "peralatan"
      kondisi_alat: "baik" | "rusak_ringan" | "rusak_berat"
      laporan_jenis: "intelijen" | "cyber" | "kejadian" | "kamtibmas"
      laporan_status:
        | "draft"
        | "terkirim"
        | "diverifikasi"
        | "ditindaklanjuti"
        | "selesai"
      sentimen: "positif" | "netral" | "negatif"
      urgensi_level: "rendah" | "sedang" | "tinggi" | "kritis"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "admin_sat",
        "admin_subden",
        "operator",
        "viewer",
      ],
      arsip_kategori: [
        "laporan",
        "surat",
        "dokumentasi",
        "intelijen",
        "cyber",
        "peralatan",
      ],
      kondisi_alat: ["baik", "rusak_ringan", "rusak_berat"],
      laporan_jenis: ["intelijen", "cyber", "kejadian", "kamtibmas"],
      laporan_status: [
        "draft",
        "terkirim",
        "diverifikasi",
        "ditindaklanjuti",
        "selesai",
      ],
      sentimen: ["positif", "netral", "negatif"],
      urgensi_level: ["rendah", "sedang", "tinggi", "kritis"],
    },
  },
} as const
