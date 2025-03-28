import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { format } from 'date-fns';

export function exportToMarkdown(content: string, type: string, league: string): string {
  // Create a timestamp in a format suitable for filenames
  const timestamp = format(new Date(), 'yyyy-MM-dd-HHmm');
  const filename = `${league}_${type}_${timestamp}.md`;
  
  // Create exports directory in the project root
  const exportDir = path.join(process.env.USERPROFILE || process.env.HOME || '.', 'Downloads');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }
  
  // Add metadata to the content
  const metadata = `---
league: ${league}
type: ${type}
generated: ${format(new Date(), 'MMMM d, yyyy h:mm a')}
---\n\n`;

  const finalContent = metadata + content;
  
  const filepath = path.join(exportDir, filename);
  fs.writeFileSync(filepath, finalContent);
  return filepath;
}

export function createMarkdownTitle(type: string, league: string): string {
  const date = format(new Date(), 'MMMM d, yyyy');
  let title = `# ${league} ${type.charAt(0).toUpperCase() + type.slice(1)}\n\n`;
  title += `*Generated on ${date}*\n\n`;
  return title;
}
