declare module './tags.controller.js' {
  import type { Request, Response } from 'express';
  export function listTagsForGallery(req: Request, res: Response): Promise<any>;
  export function createTag(req: Request, res: Response): Promise<any>;
  export function updateTag(req: Request, res: Response): Promise<any>;
  export function deleteTag(req: Request, res: Response): Promise<any>;
}


