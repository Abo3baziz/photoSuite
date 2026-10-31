import { getDb } from '../db';
import type { UIElement, NewUIElement } from '../../shared/domain/uiElement';
import { UIElementSchema } from '../../shared/domain/uiElement';
import { newId } from '../ids';

export const uiElementRepository = {
  async add(element: NewUIElement): Promise<UIElement> {
    const created: UIElement = UIElementSchema.parse({ ...element, id: newId('el') });
    await getDb().uiElements.add(created);
    return created;
  },
  async addMany(elements: readonly NewUIElement[]): Promise<UIElement[]> {
    const created = elements.map((el) => UIElementSchema.parse({ ...el, id: newId('el') }));
    await getDb().uiElements.bulkAdd(created);
    return created;
  },
  async get(id: string): Promise<UIElement | undefined> {
    return getDb().uiElements.get(id);
  },
  async listByState(screenStateId: string): Promise<UIElement[]> {
    return getDb().uiElements.where('screenStateId').equals(screenStateId).toArray();
  },
  async listByIdentity(sessionId: string, identityHash: string): Promise<UIElement[]> {
    return getDb()
      .uiElements.where('[sessionId+identityHash]')
      .equals([sessionId, identityHash])
      .toArray();
  },
  async deleteBySession(sessionId: string): Promise<void> {
    await getDb().uiElements.where('sessionId').equals(sessionId).delete();
  },
};
