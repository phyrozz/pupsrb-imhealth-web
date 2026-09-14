import { useEffect, useState } from 'react';
import { Modal, Table, Badge, Loader, Center, Text } from '@mantine/core';
import { getAprioriResult } from '../lib/api';
import assessmentData from '../data/assessment_questions.json';

const RESPONSE_COLORS = ['gray', 'blue', 'violet', 'yellow', 'red'];

interface Props {
  assessmentId: string | null;
  opened: boolean;
  onClose: () => void;
}

export default function AssessmentResponsesModal({ assessmentId, opened, onClose }: Props) {
  const [responses, setResponses] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!opened || !assessmentId) return;
    let active = true;
    const loadResponses = async () => {
      setLoading(true);
      try {
        const response = await getAprioriResult(assessmentId);
        if (active) setResponses(response.data?.responses ?? []);
      } catch (error) {
        if (active) console.error(error);
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadResponses();
    return () => { active = false; };
  }, [opened, assessmentId]);

  return (
    <Modal opened={opened} onClose={onClose} title="Assessment Responses" size="xl" >
      {loading ? (
        <Center h={200}><Loader /></Center>
      ) : (
        <Table.ScrollContainer minWidth={600}><Table striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Domain</Table.Th>
              <Table.Th>#</Table.Th>
              <Table.Th>Question</Table.Th>
              <Table.Th ta="right">Answer</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {assessmentData.questions.map((q, i) => (
              <Table.Tr key={i}>
                <Table.Td><Text fw={q.domain ? 700 : 400} size="sm">{q.domain}</Text></Table.Td>
                <Table.Td>{i + 1}</Table.Td>
                <Table.Td><Text size="sm">{q.question}</Text></Table.Td>
                <Table.Td ta="right">
                  <Badge color={RESPONSE_COLORS[responses[i]] ?? 'gray'}>
                    {assessmentData.responses[responses[i]] ?? '—'}
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table></Table.ScrollContainer>
      )}
    </Modal>
  );
}
