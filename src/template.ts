const template: string = process.env.TEMPLATE;

export function fillTemplate(data: any): string {
  const html = template
    .replace('{/* data */}', JSON.stringify(data));
  return html;
}
