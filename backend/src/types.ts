type Contact = {
  email: string;
  phone: string;
  location: string;
  linkedin: string;
};

export type Experience = {
  role: string;
  company: string;
  dates: string;
  description: string[];
};

export type Education = {
  degree: string;
  institution: string;
  dates: string;
};

export type CvData = {
  name: string;
  title: string;
  contact: Contact;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
};

export type CvExtracted = {
  name: string;
  email: string;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
};

export type CandidateChunk = {
  cv_id: string;
  source_file: string;
  candidate_name: string;
  candidate_email: string;
  section: string;
  content: string;
  similarity: number;
};
